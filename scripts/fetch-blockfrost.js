#!/usr/bin/env node
/**
 * Blockfrost Data Fetcher for Cardano DRep Governance Dashboard
 *
 * Caching strategy:
 *   - Expired proposal votes (DRep + CC): cached permanently (immutable)
 *   - Active proposal votes (DRep + CC): cached, overlaid with fresh data each run
 *   - DRep metadata (name, image): cached for 6 hours
 *   - DRep details (stake, delegators): tiered refresh
 *       - Top 300 by stake: every 2 hours
 *       - Rest: every 12 hours
 *   - Expired proposal details: cached permanently
 *   - CC members + votes: cached, refreshed each run
 *
 * Output: data/dreps.json, data/proposals.json, data/votes.json,
 *         data/simulator.json, data/meta.json,
 *         data/drep-history.json (accumulating stake snapshots),
 *         data/vote-cache.json (persistent cache)
 *
 * CC (Constitutional Committee) data fetched via Koios API (committee_info, committee_votes).
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

const KOIOS_BASE = "https://api.koios.rest/api/v1";

// CC member display names — keyed by shortHash (first 12 chars of cc_cold_id after "cc_cold1")
// Update when CC membership changes (elections, resignations, etc.)
const CC_NAMES = {
  "zwz2a08a8cqd": "Eastern Cardano Council",  // exp 726, 2-year (also has old ICC-era votes)
  "zwt49epsdedw": "Ace Alliance",              // exp 726, 2-year
  "zvvcpkl3443y": "Tingvard",                  // exp 726, 2-year
  "zwwv8uu8vgl5": "Cardano Japan Council",     // exp 653, 1-year
  "zgf5jdusmxcr": "Phil_uplc",                 // exp 653, 1-year
  "ztwq6mh5jkgw": "KtorZ",                    // exp 653, 1-year
  "zvt0am7zyhsx": "Cardano Curia",             // exp 653, replaced Cardano Atlantic Council
};

const http = require("http");

let apiCalls = 0;
let lastFetchTime = 0;

// ─── Generic URL fetcher (IPFS, https, http) ─────────────────
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];
function resolveIpfsUrl(url, gatewayIdx = 0) {
  if (!url) return null;
  const gw = IPFS_GATEWAYS[gatewayIdx] || IPFS_GATEWAYS[0];
  if (url.startsWith("ipfs://")) return gw + url.slice(7);
  if (url.startsWith("ipfs:")) return gw + url.slice(5);
  return url;
}
function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("http://") ? http : https;
    const req = mod.get(url, { timeout: timeoutMs, headers: { "Accept": "application/json, text/plain, */*" } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}
// Extract readable text from rationale JSON (CIP-100 format)
function extractRationaleText(raw) {
  try {
    const j = JSON.parse(raw);
    const body = j.body || j;
    return body.comment || body.rationale || body.summary || body.abstract ||
      (typeof body === "string" ? body : JSON.stringify(body, null, 2));
  } catch {
    return raw.slice(0, 3000);
  }
}
// Fetch rationale with IPFS gateway fallback
async function fetchRationaleContent(url) {
  const isIpfs = url && (url.startsWith("ipfs://") || url.startsWith("ipfs:"));
  if (isIpfs) {
    // Try multiple gateways
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      try {
        const resolved = resolveIpfsUrl(url, i);
        const raw = await fetchUrl(resolved, 12000);
        const text = extractRationaleText(raw);
        if (text && text.length > 0) return { url: resolved, text: text.slice(0, 5000) };
      } catch {}
    }
    return null;
  }
  // Regular URL
  try {
    const raw = await fetchUrl(url, 12000);
    const text = extractRationaleText(raw);
    if (text && text.length > 0) return { url, text: text.slice(0, 5000) };
  } catch {}
  return null;
}

// ─── Koios HTTP ─────────────────────────────────────────────
function koiosGet(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetchTime));
    setTimeout(() => {
      lastFetchTime = Date.now();
      apiCalls++;
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const url = `${KOIOS_BASE}${endpoint}${qs ? "?" + qs : ""}`;
      const req = https.get(url, {
        headers: { "Accept": "application/json" },
        timeout: 30000
      }, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn("  Koios rate limited, waiting 3s...");
            return setTimeout(() => koiosGet(endpoint, params).then(resolve).catch(reject), 3000);
          }
          if (res.statusCode !== 200) return reject(new Error(`Koios HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    }, wait);
  });
}

// ─── Blockfrost HTTP ────────────────────────────────────────
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
      console.log(`  Cache loaded: ${Object.keys(raw.expiredVotes || {}).length} expired + ${Object.keys(raw.activeVotes || {}).length} active DRep votes, ${Object.keys(raw.ccExpiredVotes || {}).length} expired + ${Object.keys(raw.ccActiveVotes || {}).length} active CC votes, ${Object.keys(raw.drepDetails || {}).length} cached details`);
      return raw;
    }
  } catch (e) { console.warn("  Cache load error:", e.message); }
  return { expiredVotes: {}, activeVotes: {}, proposals: {}, proposalDetails: [], drepMetadata: {}, drepMetadataUpdatedAt: 0, drepDetails: {}, drepStakeRank: [], ccExpiredVotes: {}, ccExpiredRationales: {}, ccActiveVotes: {}, ccActiveRationales: {}, ccMembers: [] };
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
  console.log("\n[1/8] Fetching DRep IDs...");
  const drepIds = await fetchAllPages("/governance/dreps", MAX_PAGES);
  console.log(`  Found ${drepIds.length} DRep IDs`);

  // ─── 2. DRep details + metadata (tiered refresh) ─────────
  console.log(`\n[2/8] Fetching DRep details (tiered)${useMetadataCache ? " + metadata from cache" : " + metadata"}...`);
  const cachedMeta = cache.drepMetadata || {};
  const cachedDetails = cache.drepDetails || {};
  const top300Set = new Set((cache.drepStakeRank || []).slice(0, 300));
  const DETAIL_FRESH_TOP = 2 * 60 * 60 * 1000;    // 2h for top 300 by stake
  const DETAIL_FRESH_REST = 12 * 60 * 60 * 1000;   // 12h for rest
  const now = Date.now();
  const newDrepMetadata = {};
  const newDrepDetails = {};
  let metadataFetchCount = 0, detailFetchCount = 0, detailCacheCount = 0;

  console.log(`  Tiered refresh: top ${top300Set.size} cached as priority (2h), rest 12h`);

  // Separate DReps into cached vs needs-fresh for fast path
  const needsFreshIds = [];
  const cachedDreps = [];
  for (const d of drepIds) {
    const cd = cachedDetails[d.drep_id];
    const isTop = top300Set.has(d.drep_id);
    const threshold = isTop ? DETAIL_FRESH_TOP : DETAIL_FRESH_REST;
    const fresh = !cd || !cd.fetchedAt || (now - cd.fetchedAt) >= threshold;
    const metaFresh = useMetadataCache && cachedMeta[d.drep_id];
    if (!fresh && metaFresh) {
      // Full cache hit — no API calls needed
      const meta = cachedMeta[d.drep_id] || {};
      newDrepDetails[d.drep_id] = cd;
      newDrepMetadata[d.drep_id] = meta;
      cachedDreps.push({
        drep_id: d.drep_id, name: meta.name || null, amount: cd.amount || "0",
        image_url: meta.image_url || null, delegators: cd.delegators || 0,
        last_active_epoch: cd.last_active_epoch || 0
      });
      detailCacheCount++;
    } else {
      needsFreshIds.push(d);
    }
  }
  console.log(`  Fast path: ${cachedDreps.length} fully cached, ${needsFreshIds.length} need API calls`);

  // Only run batchProcess for DReps that need fresh data
  const freshDreps = needsFreshIds.length > 0 ? await batchProcess(needsFreshIds, async (d) => {
    let amount, delegators, lastActiveEpoch;
    const cd = cachedDetails[d.drep_id];
    const isTop = top300Set.has(d.drep_id);
    const threshold = isTop ? DETAIL_FRESH_TOP : DETAIL_FRESH_REST;
    const needsFresh = !cd || !cd.fetchedAt || (now - cd.fetchedAt) >= threshold;
    if (needsFresh) {
      let detail;
      try { detail = await fetchJSON(`/governance/dreps/${d.drep_id}`); } catch (e) { return null; }
      if (!detail) return null;
      amount = detail.amount || "0";
      delegators = detail.delegators_count || 0;
      lastActiveEpoch = detail.active_epoch || 0;
      newDrepDetails[d.drep_id] = { amount, delegators, last_active_epoch: lastActiveEpoch, fetchedAt: now };
      detailFetchCount++;
    } else {
      amount = cd.amount; delegators = cd.delegators; lastActiveEpoch = cd.last_active_epoch || 0;
      newDrepDetails[d.drep_id] = cd;
      detailCacheCount++;
    }
    let name = null, image_url = null;
    if (useMetadataCache && cachedMeta[d.drep_id]) {
      name = cachedMeta[d.drep_id].name; image_url = cachedMeta[d.drep_id].image_url;
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
    return { drep_id: d.drep_id, name, amount, image_url, delegators, last_active_epoch: lastActiveEpoch };
  }, "DReps") : [];

  const dreps = [...cachedDreps, ...freshDreps];
  dreps.sort((a, b) => Number(b.amount) - Number(a.amount));
  const newStakeRank = dreps.slice(0, 300).map(d => d.drep_id);
  console.log(`  Got ${dreps.length} DReps (details: ${detailFetchCount} fresh, ${detailCacheCount} cached)`);
  if (useMetadataCache) console.log(`  Metadata: ${Object.keys(cachedMeta).length} from cache, ${metadataFetchCount} fresh`);

  // ─── 3. DRep votes ────────────────────────────────────────
  console.log("\n[3/8] Fetching DRep votes (incremental)...");
  const voteMap = {};
  const proposalSet = {};
  const drepVoteCounts = {};
  const drepVotedProposals = {};
  let cachedVoteCount = 0, freshVoteCount = 0;

  if (cache.expiredVotes) {
    Object.entries(cache.expiredVotes).forEach(([k, v]) => { voteMap[k] = v; cachedVoteCount++; });
  }
  if (cache.activeVotes) {
    Object.entries(cache.activeVotes).forEach(([k, v]) => { voteMap[k] = v; cachedVoteCount++; });
  }
  if (cache.proposals) {
    Object.entries(cache.proposals).forEach(([k, v]) => { proposalSet[k] = v; });
  }
  console.log(`  Restored ${cachedVoteCount} cached DRep votes (expired + active)`);

  // Only fetch votes for DReps with non-zero stake (skip inactive/empty DReps)
  const voteFetchDreps = dreps.filter(d => d.drep_id === "drep_always_no_confidence" || Number(d.amount) > 0);
  const skippedZeroStake = dreps.length - voteFetchDreps.length;
  console.log(`  Fetching votes for ${voteFetchDreps.length} active DReps (skipping ${skippedZeroStake} with 0 stake)`);

  await batchProcess(voteFetchDreps, async (d) => {
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
  console.log("\n[4/8] Fetching proposal details + metadata...");
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
  console.log("\n[5/8] Building simulator data + updating cache...");
  let maxVotes = 0;
  Object.values(drepVoteCounts).forEach(c => { if (c > maxVotes) maxVotes = c; });

  const expiredVotes = {};
  const activeVotes = {};
  Object.entries(voteMap).forEach(([k, v]) => {
    const propKey = k.split("__")[1];
    const exp = proposalExpirations[propKey] || 0;
    if (exp > 0 && exp < currentEpoch) {
      expiredVotes[k] = v;
    } else {
      activeVotes[k] = v; // active or unknown expiration — cache for next run
    }
  });
  const expiredProposalDetails = proposals.filter(p => p.expiration > 0 && p.expiration < currentEpoch);
  console.log(`  DRep vote cache: ${Object.keys(expiredVotes).length} expired (permanent), ${Object.keys(activeVotes).length} active`);
  console.log(`  Proposal cache: ${expiredProposalDetails.length} expired proposals`);
  // Note: saveCache moved to after CC section (step 7) to include all data

  // ─── 6. Stake history snapshot ──────────────────────────────
  console.log("\n[6/8] Updating stake history snapshot...");
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

  // ─── 7. CC (Constitutional Committee) data via Koios ───────
  console.log("\n[7/8] Fetching CC data from Koios...");
  let ccMembers = [];
  let ccVoteMap = {};
  let ccRationales = {};

  // Load cached CC votes (expired + active)
  const cachedCCExpired = cache.ccExpiredVotes || {};
  const cachedCCActive = cache.ccActiveVotes || {};
  const cachedCCRatExpired = cache.ccExpiredRationales || {};
  const cachedCCRatActive = cache.ccActiveRationales || {};
  Object.assign(ccVoteMap, cachedCCExpired, cachedCCActive);
  Object.assign(ccRationales, cachedCCRatExpired, cachedCCRatActive);
  let ccCachedCount = Object.keys(cachedCCExpired).length + Object.keys(cachedCCActive).length;
  if (ccCachedCount > 0) {
    console.log(`  Restored ${ccCachedCount} cached CC votes (${Object.keys(cachedCCExpired).length} expired, ${Object.keys(cachedCCActive).length} active)`);
  }

  try {
    // 7a. Get committee info
    const ccInfoRaw = await koiosGet("/committee_info");
    // Koios returns array — unwrap first element
    const ccInfo = Array.isArray(ccInfoRaw) ? ccInfoRaw[0] : ccInfoRaw;
    console.log(`  Response: ${Array.isArray(ccInfoRaw) ? "array[" + ccInfoRaw.length + "]" : typeof ccInfoRaw}, keys: ${ccInfo ? Object.keys(ccInfo).join(",") : "null"}`);
    if (ccInfo && ccInfo.members && ccInfo.members.length > 0) {
      console.log(`  Committee: quorum ${ccInfo.quorum_numerator}/${ccInfo.quorum_denominator}, ${ccInfo.members.length} members`);
      // DEBUG: Show all member fields from first member
      if (ccInfo.members[0]) {
        console.log(`  Member[0] keys: ${Object.keys(ccInfo.members[0]).join(", ")}`);
        console.log(`  Member[0] sample: ${JSON.stringify(ccInfo.members[0]).slice(0, 500)}`);
      }

      // Build set of expired proposal IDs for cache checking
      const expiredProposalIds = new Set();
      proposals.forEach(p => {
        if (p.expiration > 0 && p.expiration < currentEpoch) {
          expiredProposalIds.add(p.proposal_id);
        }
      });

      // 7b. For each member, fetch votes
      let ccFreshVoteCount = 0;
      for (const member of ccInfo.members) {
        const hotId = member.cc_hot_id || member.cc_hot_hex;
        const coldId = member.cc_cold_id || member.cc_cold_hex;
        if (!hotId) continue;

        const shortHash = member.cc_cold_id
          ? member.cc_cold_id.replace("cc_cold1", "").slice(0, 12)
          : (coldId || hotId).slice(0, 16);
        const displayName = CC_NAMES[shortHash] || shortHash;

        // Fetch votes for this member (Koios returns all votes)
        let memberVotes = [];
        try {
          memberVotes = await koiosGet("/committee_votes", { _cc_hot_id: hotId }) || [];
        } catch (e) {
          console.log(`    Vote fetch error for ${shortHash}: ${e.message}`);
        }

        // Always use txHash#index format to match Blockfrost proposal IDs
        const eligibleProposals = memberVotes.map(v => {
          if (v.proposal_tx_hash != null && v.proposal_index != null) return `${v.proposal_tx_hash}#${v.proposal_index}`;
          return v.proposal_id || "unknown";
        });

        ccMembers.push({
          cc_id: shortHash,
          cc_hot_id: hotId,
          cc_cold_id: coldId,
          name: displayName,
          vote_count: memberVotes.length,
          eligible_proposals: eligibleProposals,
          eligible_count: eligibleProposals.length,
          status: member.status || "active",
          expiration_epoch: member.expiration_epoch || null
        });

        // Build vote map — use txHash#index format to match Blockfrost proposals
        for (const v of memberVotes) {
          const proposalId = (v.proposal_tx_hash != null && v.proposal_index != null)
            ? `${v.proposal_tx_hash}#${v.proposal_index}`
            : (v.proposal_id || "unknown");
          ccVoteMap[`${shortHash}__${proposalId}`] = v.vote;
          ccFreshVoteCount++;

          if (v.meta_url) {
            const rUrl = typeof v.meta_url === "object" ? v.meta_url.url : v.meta_url;
            if (rUrl) ccRationales[`${shortHash}__${proposalId}`] = rUrl;
          }
        }

        console.log(`    ${displayName} (${shortHash}): ${memberVotes.length} votes`);
      }
      console.log(`  Total: ${ccMembers.length} members, ${Object.keys(ccVoteMap).length} votes (${ccCachedCount} cached, ${ccFreshVoteCount} fresh), ${Object.keys(ccRationales).length} rationales`);
    } else {
      console.log("  No committee info from Koios, keeping existing static files");
    }
  } catch (e) {
    console.log(`  Koios CC error: ${e.message} — keeping existing static files`);
  }

  // Build CC vote cache (expired = permanent, active = refreshable)
  const ccExpiredVotes = {};
  const ccExpiredRationales = {};
  const ccActiveVotes = {};
  const ccActiveRationales = {};
  Object.entries(ccVoteMap).forEach(([k, v]) => {
    const propId = k.split("__")[1];
    const exp = proposalExpirations[propId] || 0;
    if (exp > 0 && exp < currentEpoch) {
      ccExpiredVotes[k] = v;
    } else {
      ccActiveVotes[k] = v;
    }
  });
  Object.entries(ccRationales).forEach(([k, v]) => {
    const propId = k.split("__")[1];
    const exp = proposalExpirations[propId] || 0;
    if (exp > 0 && exp < currentEpoch) {
      ccExpiredRationales[k] = v;
    } else {
      ccActiveRationales[k] = v;
    }
  });
  console.log(`  CC vote cache: ${Object.keys(ccExpiredVotes).length} expired, ${Object.keys(ccActiveVotes).length} active`);

  // ─── 7c. Download rationale content from IPFS/URLs ──────────
  if (Object.keys(ccRationales).length > 0) {
    console.log(`\n  Downloading ${Object.keys(ccRationales).length} rationale documents...`);
    const ratEntries = Object.entries(ccRationales);
    let downloaded = 0, failed = 0, cached = 0;
    const ccRationaleContent = {};

    for (const [key, val] of ratEntries) {
      // If already downloaded (has .text field from cache), skip
      if (typeof val === "object" && val.text) {
        ccRationaleContent[key] = val;
        cached++;
        continue;
      }
      const url = typeof val === "string" ? val : (val.url || val);
      try {
        const result = await fetchRationaleContent(url);
        if (result) {
          ccRationaleContent[key] = result;
          downloaded++;
        } else {
          ccRationaleContent[key] = { url: resolveIpfsUrl(url), text: "" };
          failed++;
        }
      } catch {
        ccRationaleContent[key] = { url: resolveIpfsUrl(url), text: "" };
        failed++;
      }
      // Small delay to avoid hammering IPFS gateways
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`  Rationales: ${downloaded} downloaded, ${cached} cached, ${failed} failed`);
    // Replace URL-only entries with content objects
    Object.assign(ccRationales, ccRationaleContent);

    // Update cache rationale entries too
    Object.entries(ccRationales).forEach(([k, v]) => {
      const propId = k.split("__")[1];
      const exp = proposalExpirations[propId] || 0;
      if (exp > 0 && exp < currentEpoch) {
        ccExpiredRationales[k] = v;
      } else {
        ccActiveRationales[k] = v;
      }
    });
  }

  // ─── 7d. DRep rationale URLs via Koios proposal_votes ────────
  let drepRationales = {};
  // Load cached DRep rationales
  const cachedDrepRatExpired = cache.drepExpiredRationales || {};
  const cachedDrepRatActive = cache.drepActiveRationales || {};
  Object.assign(drepRationales, cachedDrepRatExpired, cachedDrepRatActive);
  const drepRatCachedCount = Object.keys(drepRationales).length;
  if (drepRatCachedCount > 0) {
    console.log(`\n  Restored ${drepRatCachedCount} cached DRep rationales`);
  }

  try {
    console.log("\n  Fetching DRep rationale URLs via Koios proposal_votes...");
    // Step 1: Get proposal list from Koios to get bech32 IDs
    let allKoiosProposals = [];
    let offset = 0;
    const PAGE = 500;
    while (true) {
      const page = await koiosGet("/proposal_list", { offset, limit: PAGE });
      if (!page || page.length === 0) break;
      allKoiosProposals = allKoiosProposals.concat(page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`    Koios proposal_list: ${allKoiosProposals.length} proposals`);

    // Build mapping: txHash#certIndex → bech32 proposal_id
    const bech32Map = {};
    for (const kp of allKoiosProposals) {
      if (kp.proposal_tx_hash && kp.proposal_index != null && kp.proposal_id) {
        const key = `${kp.proposal_tx_hash}#${kp.proposal_index}`;
        bech32Map[key] = kp.proposal_id;
      }
    }
    console.log(`    Mapped ${Object.keys(bech32Map).length} proposals to bech32 IDs`);

    // Step 2: For each proposal we know about, check if we already have all rationale URLs cached
    // Only fetch proposal_votes for proposals where we might get new rationales
    const propsToFetch = proposals.filter(p => {
      const bech32Id = bech32Map[p.proposal_id];
      if (!bech32Id) return false;
      // Skip expired proposals where we already have cached rationales
      const exp = p.expiration || 0;
      if (exp > 0 && exp < currentEpoch && cachedDrepRatExpired[`__check__${p.proposal_id}`] !== undefined) return false;
      return true;
    });
    console.log(`    Fetching votes for ${propsToFetch.length} proposals (${proposals.length - propsToFetch.length} fully cached)`);

    let drepRatUrlCount = 0;
    for (const p of propsToFetch) {
      const bech32Id = bech32Map[p.proposal_id];
      if (!bech32Id) continue;
      try {
        // Koios may paginate, fetch all pages
        let allVotes = [];
        let vOffset = 0;
        while (true) {
          const votes = await koiosGet("/proposal_votes", { _proposal_id: bech32Id, offset: vOffset, limit: 500 });
          if (!votes || votes.length === 0) break;
          allVotes = allVotes.concat(votes);
          if (votes.length < 500) break;
          vOffset += 500;
        }
        // Extract DRep votes with meta_url
        for (const v of allVotes) {
          if (v.voter_role === "DRep" && v.meta_url) {
            const metaUrl = typeof v.meta_url === "object" ? v.meta_url.url : v.meta_url;
            if (metaUrl && v.voter_id) {
              const key = `${v.voter_id}__${p.proposal_id}`;
              // Don't overwrite already-downloaded content
              if (!drepRationales[key] || typeof drepRationales[key] === "string") {
                drepRationales[key] = metaUrl;
                drepRatUrlCount++;
              }
            }
          }
        }
      } catch (e) {
        console.log(`    Error fetching votes for ${p.proposal_id.slice(0,16)}...: ${e.message}`);
      }
    }
    console.log(`    Found ${drepRatUrlCount} new DRep rationale URLs`);
  } catch (e) {
    console.log(`    DRep rationale fetch error: ${e.message}`);
  }

  // Step 3: Download DRep rationale content (same as CC)
  const drepRatUrlEntries = Object.entries(drepRationales).filter(([, v]) => typeof v === "string");
  if (drepRatUrlEntries.length > 0) {
    console.log(`\n  Downloading ${drepRatUrlEntries.length} DRep rationale documents...`);
    let dlOk = 0, dlFail = 0;
    for (const [key, url] of drepRatUrlEntries) {
      try {
        const result = await fetchRationaleContent(url);
        if (result) {
          drepRationales[key] = result;
          dlOk++;
        } else {
          drepRationales[key] = { url: resolveIpfsUrl(url), text: "" };
          dlFail++;
        }
      } catch {
        drepRationales[key] = { url: resolveIpfsUrl(url), text: "" };
        dlFail++;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`    DRep rationales: ${dlOk} downloaded, ${dlFail} failed, ${drepRatCachedCount} cached`);
  }

  // Build DRep rationale cache (expired = permanent)
  const drepExpiredRationales = {};
  const drepActiveRationales = {};
  Object.entries(drepRationales).forEach(([k, v]) => {
    const propId = k.split("__")[1];
    const exp = proposalExpirations[propId] || 0;
    if (exp > 0 && exp < currentEpoch) {
      drepExpiredRationales[k] = v;
    } else {
      drepActiveRationales[k] = v;
    }
  });
  console.log(`  DRep rationale cache: ${Object.keys(drepExpiredRationales).length} expired, ${Object.keys(drepActiveRationales).length} active`);

  // ─── Save unified cache ────────────────────────────────────
  saveCache({
    expiredVotes,
    activeVotes,
    proposals: Object.fromEntries(Object.entries(proposalSet).filter(([k]) => {
      const exp = proposalExpirations[k] || 0;
      return exp > 0 && exp < currentEpoch;
    })),
    proposalDetails: expiredProposalDetails,
    drepVoteCounts, drepVotedProposals,
    drepMetadata: newDrepMetadata,
    drepMetadataUpdatedAt: useMetadataCache ? cache.drepMetadataUpdatedAt : Date.now(),
    drepDetails: newDrepDetails,
    drepStakeRank: newStakeRank,
    ccExpiredVotes, ccExpiredRationales,
    ccActiveVotes, ccActiveRationales,
    drepExpiredRationales, drepActiveRationales,
    ccMembers,
    currentEpoch
  });

  // ─── 8. Write output files ────────────────────────────────
  console.log("\n[8/8] Writing JSON files...");
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

  // Write CC data (only if Koios returned data, otherwise keep existing files)
  if (ccMembers.length > 0) {
    fs.writeFileSync(path.join(DATA_DIR, "cc-members.json"), JSON.stringify(ccMembers));
    fs.writeFileSync(path.join(DATA_DIR, "cc-votes.json"), JSON.stringify(ccVoteMap));
    fs.writeFileSync(path.join(DATA_DIR, "cc-rationales.json"), JSON.stringify(ccRationales));
    console.log(`  CC: ${ccMembers.length} members, ${Object.keys(ccVoteMap).length} votes written`);
  }

  // Write DRep rationales
  if (Object.keys(drepRationales).length > 0) {
    fs.writeFileSync(path.join(DATA_DIR, "drep-rationales.json"), JSON.stringify(drepRationales));
    console.log(`  DRep rationales: ${Object.keys(drepRationales).length} written`);
  }

  const files = ["dreps.json", "proposals.json", "votes.json", "simulator.json", "meta.json", "vote-cache.json", "drep-history.json", "cc-members.json", "cc-votes.json", "cc-rationales.json", "drep-rationales.json"];
  files.forEach(f => {
    try { const size = fs.statSync(path.join(DATA_DIR, f)).size; console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`); } catch (e) {}
  });

  console.log(`\n=== Done! ===`);
  console.log(`API calls: ${apiCalls}${useMetadataCache ? " (metadata cached)" : ""}`);
  console.log(`DRep votes: ${Object.keys(voteMap).length} (${cachedVoteCount} from cache)`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
