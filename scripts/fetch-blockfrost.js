#!/usr/bin/env node
/**
 * Blockfrost Data Fetcher for Cardano DRep Governance Dashboard
 *
 * Caching strategy:
 *   - Expired proposal votes (DRep): cached permanently (immutable)
 *   - DRep metadata (name, image): cached for 6 hours
 *   - DRep details (stake, delegators): always fresh
 *   - Active proposal votes: always fresh
 *   - Expired proposal details: cached permanently
 *
 * Output: data/dreps.json, data/proposals.json, data/votes.json,
 *         data/simulator.json, data/meta.json,
 *         data/drep-history.json (accumulating stake snapshots),
 *         data/vote-cache.json (persistent cache)
 *
 * Note: CC (Constitutional Committee) vote data is maintained as static JSON files
 *       (cc-members.json, cc-votes.json, cc-rationales.json) and not fetched via API.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BLOCKFROST_API_KEY;
if (!API_KEY) { console.error("ERROR: BLOCKFROST_API_KEY env var required"); process.exit(1); }

const BASE = "https://cardano-mainnet.blockfrost.io/api/v0";
const PAGE_SIZE = 100;
const CONCURRENT = 5;
const THROTTLE_MS = 110;
const MAX_PAGES = 30;
const DATA_DIR = path.resolve(__dirname, "..", "data");
const CACHE_FILE = path.join(DATA_DIR, "vote-cache.json");
const METADATA_CACHE_HOURS = 6;

let apiCalls = 0;
let lastFetchTime = 0;

// ─── HTTP ───────────────────────────────────────────────────
function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetchTime));
    setTimeout(() => {
      lastFetchTime = Date.now();
      apiCalls++;
      const req = https.get(`${BASE}${urlPath}`, {
        headers: { "project_id": API_KEY, "Accept": "application/json" },
        timeout: 30000
      }, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn("  Rate limited, waiting 2s...");
            return setTimeout(() => fetchJSON(urlPath).then(resolve).catch(reject), 2000);
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

async function batchProcess(items, fn, label = "", batchSize = CONCURRENT) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const br = await Promise.allSettled(batch.map(fn));
    br.forEach(r => { if (r.status === "fulfilled" && r.value) results.push(r.value); });
    if (i % (batchSize * 10) === 0 && i > 0) {
      console.log(`  ${label} ${results.length}/${items.length}...`);
    }
  }
  return results;
}

function safeName(v) {
  return typeof v === "string" ? v : (v && typeof v === "object" ? (v["@value"] || v.givenName || JSON.stringify(v)) : null);
}

// ─── Cache helpers ──────────────────────────────────────────
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      console.log(`  Cache loaded: ${Object.keys(raw.expiredVotes || {}).length} expired DRep votes`);
      return raw;
    }
  } catch (e) { console.warn("  Cache load error:", e.message); }
  return { expiredVotes: {}, proposals: {}, proposalDetails: [], drepMetadata: {}, drepMetadataUpdatedAt: 0 };
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  const size = fs.statSync(CACHE_FILE).size;
  console.log(`  vote-cache.json: ${(size / 1024).toFixed(1)} KB`);
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=== Blockfrost Data Fetcher (Incremental) ===");
  console.log(`Time: ${new Date().toISOString()}`);

  const cache = loadCache();

  const latestBlock = await fetchJSON("/blocks/latest");
  const currentEpoch = latestBlock ? latestBlock.epoch : 999;
  console.log(`Current epoch: ${currentEpoch}`);

  const metaCacheAge = Date.now() - (cache.drepMetadataUpdatedAt || 0);
  const metaCacheAgeHours = metaCacheAge / (1000 * 60 * 60);
  const useMetadataCache = metaCacheAgeHours < METADATA_CACHE_HOURS && Object.keys(cache.drepMetadata || {}).length > 0;
  console.log(`Metadata cache: ${useMetadataCache ? `FRESH (${metaCacheAgeHours.toFixed(1)}h old)` : `STALE (${metaCacheAgeHours.toFixed(1)}h old, re-fetching)`}`);

  // ─── 1. DRep IDs ──────────────────────────────────────────
  console.log("\n[1/7] Fetching DRep IDs...");
  const drepIds = await fetchAllPages("/governance/dreps", MAX_PAGES);
  console.log(`  Found ${drepIds.length} DRep IDs`);

  // ─── 2. DRep details + metadata ───────────────────────────
  console.log(`\n[2/7] Fetching DRep details${useMetadataCache ? " (metadata from cache)" : " + metadata"}...`);
  const cachedMeta = cache.drepMetadata || {};
  const newDrepMetadata = {};
  let metadataFetchCount = 0;

  const dreps = await batchProcess(drepIds, async (d) => {
    let detail;
    try { detail = await fetchJSON(`/governance/dreps/${d.drep_id}`); } catch (e) { return null; }
    if (!detail) return null;
    let name = null, image_url = null;
    if (useMetadataCache && cachedMeta[d.drep_id]) {
      name = cachedMeta[d.drep_id].name;
      image_url = cachedMeta[d.drep_id].image_url;
      newDrepMetadata[d.drep_id] = cachedMeta[d.drep_id];
    } else {
      try {
        const meta = await fetchJSON(`/governance/dreps/${d.drep_id}/metadata`);
        if (meta && meta.json_metadata) {
          const body = meta.json_metadata.body || meta.json_metadata;
          name = safeName(body?.givenName || body?.name || null);
          image_url = body?.image?.contentUrl || null;
        }
        metadataFetchCount++;
      } catch (e) {}
      newDrepMetadata[d.drep_id] = { name, image_url };
    }
    return {
      drep_id: d.drep_id, name, amount: detail.amount || "0", image_url,
      delegators: detail.delegators_count || 0,
      last_active_epoch: detail.active_epoch || 0
    };
  }, "DReps");
  dreps.sort((a, b) => Number(b.amount) - Number(a.amount));
  console.log(`  Got ${dreps.length} DReps`);
  if (useMetadataCache) console.log(`  Metadata: ${Object.keys(cachedMeta).length} from cache, ${metadataFetchCount} fresh`);

  // ─── 3. DRep votes ────────────────────────────────────────
  console.log("\n[3/7] Fetching DRep votes (incremental)...");
  const voteMap = {};
  const proposalSet = {};
  const drepVoteCounts = {};
  const drepVotedProposals = {};
  let cachedVoteCount = 0, freshVoteCount = 0;

  if (cache.expiredVotes) {
    Object.entries(cache.expiredVotes).forEach(([k, v]) => { voteMap[k] = v; cachedVoteCount++; });
  }
  if (cache.proposals) {
    Object.entries(cache.proposals).forEach(([k, v]) => { proposalSet[k] = v; });
  }
  console.log(`  Restored ${cachedVoteCount} cached expired DRep votes`);

  await batchProcess(dreps, async (d) => {
    let votes;
    try { votes = await fetchAllPages(`/governance/dreps/${d.drep_id}/votes`, 10); } catch (e) { return null; }
    if (!votes || votes.length === 0) return null;
    const votedProps = [];
    votes.forEach(v => {
      const txHash = v.proposal_tx_hash || v.tx_hash || "";
      const certIdx = v.proposal_cert_index != null ? v.proposal_cert_index : (v.cert_index != null ? v.cert_index : -1);
      if (!txHash) return;
      const propKey = `${txHash}#${certIdx}`;
      let vote = (v.vote || "").toLowerCase();
      if (vote === "yes") vote = "Yes"; else if (vote === "no") vote = "No"; else if (vote === "abstain") vote = "Abstain"; else return;
      voteMap[`${d.drep_id}__${propKey}`] = vote;
      votedProps.push(propKey);
      freshVoteCount++;
      if (!proposalSet[propKey]) proposalSet[propKey] = { tx_hash: txHash, cert_index: certIdx };
    });
    drepVoteCounts[d.drep_id] = votes.length;
    drepVotedProposals[d.drep_id] = votedProps;
    return d;
  }, "Votes");
  console.log(`  Fresh: ${freshVoteCount}, Total: ${Object.keys(voteMap).length}`);

  // ─── 4. Proposal details ──────────────────────────────────
  console.log("\n[4/7] Fetching proposal details + metadata...");
  const cachedProposalIds = new Set(Object.keys(cache.proposals || {}));
  const newPropEntries = Object.entries(proposalSet).filter(([k]) => !cachedProposalIds.has(k));
  console.log(`  ${newPropEntries.length} new proposals (${cachedProposalIds.size} cached)`);

  const typeMap = {
    "treasury_withdrawals": "TreasuryWithdrawals", "hard_fork_initiation": "HardForkInitiation",
    "parameter_change": "ParameterChange", "no_confidence": "NoConfidence",
    "update_committee": "UpdateCommittee", "new_constitution": "NewConstitution", "info_action": "InfoAction"
  };

  const allProposals = {};
  if (cache.proposalDetails) cache.proposalDetails.forEach(p => { allProposals[p.proposal_id] = p; });

  const newProposals = await batchProcess(newPropEntries, async ([propKey, info]) => {
    let proposal_type = "", title = "", expiration = 0;
    try {
      const detail = await fetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}`);
      if (detail) { proposal_type = typeMap[detail.governance_type] || detail.governance_type || ""; expiration = detail.expiration || 0; }
    } catch (e) {}
    try {
      const meta = await fetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}/metadata`);
      if (meta && meta.json_metadata) {
        const body = meta.json_metadata.body || meta.json_metadata;
        title = body?.title || "";
        if (typeof title === "object") title = JSON.stringify(title);
      }
    } catch (e) {}
    return { proposal_id: propKey, tx_hash: info.tx_hash, cert_index: info.cert_index, proposal_type, title, expiration, epoch_no: expiration };
  }, "Props");
  newProposals.forEach(p => { allProposals[p.proposal_id] = p; });

  const proposals = Object.values(allProposals);
  proposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
  console.log(`  Total proposals: ${proposals.length}`);

  const proposalExpirations = {};
  proposals.forEach(p => { proposalExpirations[p.proposal_id] = p.expiration || 0; });

  // ─── 5. Build simulator data + update cache ───────────────
  console.log("\n[5/7] Building simulator data + updating cache...");
  let maxVotes = 0;
  Object.values(drepVoteCounts).forEach(c => { if (c > maxVotes) maxVotes = c; });

  const expiredVotes = {};
  Object.entries(voteMap).forEach(([k, v]) => {
    const propKey = k.split("__")[1];
    const exp = proposalExpirations[propKey] || 0;
    if (exp > 0 && exp < currentEpoch) expiredVotes[k] = v;
  });
  const expiredProposalDetails = proposals.filter(p => p.expiration > 0 && p.expiration < currentEpoch);
  console.log(`  Caching: ${Object.keys(expiredVotes).length} DRep votes, ${expiredProposalDetails.length} proposals`);

  saveCache({
    expiredVotes,
    proposals: Object.fromEntries(Object.entries(proposalSet).filter(([k]) => {
      const exp = proposalExpirations[k] || 0;
      return exp > 0 && exp < currentEpoch;
    })),
    proposalDetails: expiredProposalDetails,
    drepVoteCounts, drepVotedProposals,
    drepMetadata: newDrepMetadata,
    drepMetadataUpdatedAt: useMetadataCache ? cache.drepMetadataUpdatedAt : Date.now(),
    currentEpoch
  });

  // ─── 6. Stake history snapshot ──────────────────────────────
  console.log("\n[6/7] Updating stake history snapshot...");
  const HISTORY_FILE = path.join(DATA_DIR, "drep-history.json");
  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) { console.warn("  History load error:", e.message); history = []; }

  const hasEpoch = history.some(s => s.epoch === currentEpoch);
  if (!hasEpoch) {
    // Exclude: drep_always_abstain, inactive (0 stake) DReps
    // Include: drep_always_no_confidence (counts as real voting power)
    const activeDreps = dreps.filter(d =>
      d.drep_id !== "drep_always_abstain" && Number(d.amount) > 0
    );
    const top50 = activeDreps.slice(0, 50).map(d => ({
      id: d.drep_id, name: d.name, amount: d.amount, delegators: d.delegators
    }));
    const totalStake = activeDreps.reduce((s, d) => s + Number(d.amount), 0);
    history.push({
      epoch: currentEpoch,
      timestamp: Date.now(),
      total_stake: String(totalStake),
      drep_count: activeDreps.length,
      top: top50
    });
    history.sort((a, b) => a.epoch - b.epoch);
    console.log(`  Stake snapshot added: epoch ${currentEpoch}, ${activeDreps.length} active DReps (excl abstain+inactive), total ${(totalStake / 1e6).toFixed(0)} ADA`);
  } else {
    console.log(`  Epoch ${currentEpoch} already in history (${history.length} snapshots total)`);
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));

  // ─── 7. Write output files ────────────────────────────────
  console.log("\n[7/7] Writing JSON files...");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const meta = {
    updated_at: new Date().toISOString(),
    updated_ts: Date.now(),
    drep_count: dreps.length,
    proposal_count: proposals.length,
    vote_count: Object.keys(voteMap).length,
    api_calls: apiCalls,
    fetch_duration_ms: Date.now() - startTime,
    max_votes: maxVotes,
    current_epoch: currentEpoch,
    cached_expired_votes: Object.keys(expiredVotes).length,
    metadata_from_cache: useMetadataCache
  };

  fs.writeFileSync(path.join(DATA_DIR, "dreps.json"), JSON.stringify(dreps));
  fs.writeFileSync(path.join(DATA_DIR, "proposals.json"), JSON.stringify(proposals));
  fs.writeFileSync(path.join(DATA_DIR, "votes.json"), JSON.stringify(voteMap));
  fs.writeFileSync(path.join(DATA_DIR, "simulator.json"), JSON.stringify({
    drepVoteCounts, drepVotedProposals, proposalExpirations, maxVotes
  }));
  fs.writeFileSync(path.join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  const files = ["dreps.json", "proposals.json", "votes.json", "simulator.json", "meta.json", "vote-cache.json", "drep-history.json"];
  files.forEach(f => {
    try { const size = fs.statSync(path.join(DATA_DIR, f)).size; console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`); } catch (e) {}
  });

  console.log(`\n=== Done! ===`);
  console.log(`API calls: ${apiCalls}${useMetadataCache ? " (metadata cached)" : ""}`);
  console.log(`DRep votes: ${Object.keys(voteMap).length} (${cachedVoteCount} from cache)`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
