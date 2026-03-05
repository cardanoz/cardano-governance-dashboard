#!/usr/bin/env node
/**
 * Blockfrost Data Fetcher for Cardano DRep Governance Dashboard
 *
 * Caching strategy:
 *   - Expired proposal votes (DRep + CC): cached permanently (immutable)
 *   - Active proposal votes (DRep + CC): cached, overlaid with fresh data each run
 *   - DRep metadata (name, image): cached for 6 hours
 *   - DRep live stake (via Koios /drep_info): tiered refresh
 *       - Top 100 by stake: every 1 hour
 *       - Rest: every 6 hours
 *   - DRep votes: every 3 hours (cached between runs)
 *   - Expired proposal details: cached permanently
 *   - CC members + votes: cached, refreshed each run
 *
 * Output: data/dreps.json, data/proposals.json, data/votes.json,
 *         data/simulator.json, data/meta.json,
 *         data/drep-history.json (accumulating stake snapshots),
 *         data/vote-cache.json (persistent cache),
 *         data/protocol-params.json (governance thresholds + network parameters),
 *         data/governance-info.json (network info + proposal voting summaries)
 *
 * CC (Constitutional Committee) data fetched via Koios API (committee_info, committee_votes).
 * SPO (Stake Pool Operator) data fetched via Koios API (proposal_votes, pool_list, pool_info).
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
  "https://ipfs.blockfrost.dev/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];
function resolveIpfsUrl(url, gatewayIdx = 0) {
  if (!url) return null;
  const cid = extractIpfsCid(url);
  if (cid) return (IPFS_GATEWAYS[gatewayIdx] || IPFS_GATEWAYS[0]) + cid;
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
// Extract readable text from rationale JSON (CIP-100 / CIP-136 format)
// CIP-136 CC vote fields: summary, rationaleStatement, precedentDiscussion, counterargumentDiscussion, conclusion, internalVote
// CIP-100 general fields: comment, rationale, summary, abstract, motivation
function extractRationaleText(raw) {
  try {
    const j = JSON.parse(raw);
    const body = j.body || j;
    if (typeof body === "string") return body;

    // Collect all meaningful text fields in order
    const sections = [];
    const fieldOrder = [
      ["summary", "Summary"],
      ["abstract", "Abstract"],
      ["motivation", "Motivation"],
      ["rationale", "Rationale"],
      ["rationaleStatement", "Rationale Statement"],
      ["precedentDiscussion", "Precedent Discussion"],
      ["counterargumentDiscussion", "Counterargument Discussion"],
      ["conclusion", "Conclusion"],
      ["internalVote", "Internal Vote"],
      ["comment", "Comment"],
    ];
    for (const [key, label] of fieldOrder) {
      const val = body[key];
      if (val && typeof val === "string" && val.trim()) {
        sections.push(`[${label}]\n${val.trim()}`);
      } else if (val && typeof val === "object") {
        // Handle @value or nested structure
        const txt = val["@value"] || (Array.isArray(val) ? val.map(v => typeof v === "string" ? v : (v["@value"] || "")).join("\n") : JSON.stringify(val));
        if (txt && txt.trim()) sections.push(`[${label}]\n${txt.trim()}`);
      }
    }
    // If we found structured fields, join them
    if (sections.length > 0) return sections.join("\n\n");
    // Fallback: any text-like fields
    const anyText = Object.entries(body)
      .filter(([k, v]) => typeof v === "string" && v.trim() && !k.startsWith("@"))
      .map(([k, v]) => `[${k}]\n${v.trim()}`).join("\n\n");
    if (anyText) return anyText;
    return JSON.stringify(body, null, 2);
  } catch {
    return raw.slice(0, 5000);
  }
}
// Extract IPFS CID from any URL or ipfs:// scheme
function extractIpfsCid(url) {
  if (!url) return null;
  // ipfs://Qm... or ipfs:Qm...
  if (url.startsWith("ipfs://")) return url.slice(7);
  if (url.startsWith("ipfs:")) return url.slice(5);
  // https://gateway.example.com/ipfs/Qm...
  const m = url.match(/\/ipfs\/(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/);
  if (m) return m[1];
  return null;
}
// Fetch rationale with IPFS gateway fallback
async function fetchRationaleContent(url) {
  const cid = extractIpfsCid(url);
  if (cid) {
    // Try multiple IPFS gateways
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      try {
        const resolved = IPFS_GATEWAYS[i] + cid;
        const raw = await fetchUrl(resolved, 8000);
        const text = extractRationaleText(raw);
        if (text && text.length > 0) return { url: resolved, text: text.slice(0, 15000) };
      } catch (e) {
        // Continue to next gateway
      }
    }
    return null;
  }
  // Non-IPFS URL (e.g. regular https link)
  try {
    const raw = await fetchUrl(url, 10000);
    const text = extractRationaleText(raw);
    if (text && text.length > 0) return { url, text: text.slice(0, 15000) };
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

// ─── Koios POST (for bulk endpoints like /drep_info) ────────
function koiosPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetchTime));
    setTimeout(() => {
      lastFetchTime = Date.now();
      apiCalls++;
      const url = new URL(`${KOIOS_BASE}${endpoint}`);
      const postData = JSON.stringify(body);
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 60000
      }, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn("  Koios rate limited, waiting 3s...");
            return setTimeout(() => koiosPost(endpoint, body).then(resolve).catch(reject), 3000);
          }
          if (res.statusCode !== 200) return reject(new Error(`Koios POST ${res.statusCode}: ${data.slice(0, 300)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.write(postData);
      req.end();
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
  return { expiredVotes: {}, activeVotes: {}, proposals: {}, proposalDetails: [], drepMetadata: {}, drepMetadataUpdatedAt: 0, drepDetails: {}, drepStakeRank: [], ccExpiredVotes: {}, ccExpiredRationales: {}, ccActiveVotes: {}, ccActiveRationales: {}, ccMembers: [], lastVoteFetchAt: 0, lastCCFetchAt: 0 };
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
  console.log("\n[1/9] Fetching DRep IDs...");
  const drepIds = await fetchAllPages("/governance/dreps", MAX_PAGES);
  console.log(`  Found ${drepIds.length} DRep IDs`);

  // ─── 2. DRep live stakes (Koios) + metadata (Blockfrost) ──
  console.log(`\n[2/9] Fetching DRep live stakes (tiered) + metadata...`);
  const cachedMeta = cache.drepMetadata || {};
  const cachedDetails = cache.drepDetails || {};
  const top100Set = new Set((cache.drepStakeRank || []).slice(0, 100));
  const DETAIL_FRESH_TOP = 1 * 60 * 60 * 1000;    // 1h for top 100 by stake
  const DETAIL_FRESH_REST = 6 * 60 * 60 * 1000;    // 6h for rest
  const now = Date.now();
  const newDrepMetadata = {};
  const newDrepDetails = {};
  let metadataFetchCount = 0, detailFetchCount = 0, detailCacheCount = 0;

  console.log(`  Tiered refresh: top ${top100Set.size} priority (1h), rest 6h`);

  // Separate DReps into needs-stake-refresh vs fully-cached
  const needsStakeIds = [];
  const cachedDreps = [];
  for (const d of drepIds) {
    const cd = cachedDetails[d.drep_id];
    const isTop = top100Set.has(d.drep_id);
    const threshold = isTop ? DETAIL_FRESH_TOP : DETAIL_FRESH_REST;
    const needsRefresh = !cd || !cd.fetchedAt || (now - cd.fetchedAt) >= threshold;
    if (!needsRefresh) {
      newDrepDetails[d.drep_id] = cd;
      detailCacheCount++;
    } else {
      needsStakeIds.push(d);
    }
  }
  console.log(`  Live stake: ${needsStakeIds.length} need refresh, ${detailCacheCount} cached`);

  // Bulk fetch live stakes from Koios /drep_info (POST, batches of 50)
  if (needsStakeIds.length > 0) {
    const KOIOS_BATCH = 50;
    const allIds = needsStakeIds.map(d => d.drep_id);
    let koiosSuccess = 0, koiosFail = 0;
    for (let i = 0; i < allIds.length; i += KOIOS_BATCH) {
      const batch = allIds.slice(i, i + KOIOS_BATCH);
      try {
        const result = await koiosPost("/drep_info", { _drep_ids: batch });
        if (Array.isArray(result)) {
          for (const info of result) {
            const id = info.drep_id;
            if (!id) continue;
            // Prefer live_delegated_stake, fall back to amount or active_delegated_stake
            const liveStake = info.live_delegated_stake || info.amount || info.active_delegated_stake || "0";
            const delegators = info.live_delegators_count || info.delegators_count || 0;
            newDrepDetails[id] = {
              amount: String(liveStake),
              delegators: delegators,
              last_active_epoch: info.active_epoch_no || 0,
              fetchedAt: now,
              source: "koios_live"
            };
            koiosSuccess++;
          }
        }
      } catch (e) {
        console.log(`    Koios /drep_info batch error (offset ${i}): ${e.message}`);
        koiosFail += batch.length;
      }
      if (i > 0 && i % (KOIOS_BATCH * 5) === 0) {
        console.log(`    Live stake progress: ${i}/${allIds.length}...`);
      }
    }
    detailFetchCount = koiosSuccess;
    console.log(`  Koios live stake: ${koiosSuccess} fetched, ${koiosFail} failed`);

    // Fallback: for any DReps not returned by Koios, try Blockfrost
    const missingIds = needsStakeIds.filter(d => !newDrepDetails[d.drep_id]);
    if (missingIds.length > 0) {
      console.log(`  Fallback: ${missingIds.length} DReps via Blockfrost...`);
      const fallbackDreps = await batchProcess(missingIds, async (d) => {
        let detail;
        try { detail = await fetchJSON(`/governance/dreps/${d.drep_id}`); } catch (e) { return null; }
        if (!detail) return null;
        newDrepDetails[d.drep_id] = {
          amount: detail.amount || "0",
          delegators: detail.delegators_count || 0,
          last_active_epoch: detail.active_epoch || 0,
          fetchedAt: now,
          source: "blockfrost"
        };
        return d;
      }, "Fallback");
      console.log(`  Blockfrost fallback: ${fallbackDreps.length} fetched`);
    }
  }

  // Cross-check top DReps with Blockfrost to detect Koios staleness
  // Koios live_delegated_stake can lag behind; Blockfrost amount is often fresher
  const CROSSCHECK_TOP = 20;
  const crosscheckIds = Object.entries(newDrepDetails)
    .filter(([id, d]) => d.source === "koios_live" && !id.startsWith("drep_always_"))
    .sort((a, b) => Number(b[1].amount) - Number(a[1].amount))
    .slice(0, CROSSCHECK_TOP)
    .map(([id]) => id);
  if (crosscheckIds.length > 0) {
    console.log(`  Cross-checking top ${crosscheckIds.length} DReps via Blockfrost...`);
    let upgraded = 0;
    for (const drepId of crosscheckIds) {
      try {
        const detail = await fetchJSON(`/governance/dreps/${drepId}`);
        if (detail && detail.amount) {
          const bfAmount = BigInt(detail.amount);
          const koiosAmount = BigInt(newDrepDetails[drepId].amount || "0");
          if (bfAmount > koiosAmount) {
            const diffAda = Number(bfAmount - koiosAmount) / 1e6;
            console.log(`    ${drepId.slice(0, 20)}... Blockfrost=${bfAmount} > Koios=${koiosAmount} (+${diffAda.toFixed(0)} ADA) → upgraded`);
            newDrepDetails[drepId].amount = String(bfAmount);
            newDrepDetails[drepId].delegators = detail.delegators_count || newDrepDetails[drepId].delegators;
            newDrepDetails[drepId].source = "blockfrost_crosscheck";
            upgraded++;
          }
        }
      } catch (e) {
        // Blockfrost call failed, keep Koios value
      }
      await new Promise(r => setTimeout(r, THROTTLE_MS));
    }
    console.log(`  Cross-check: ${upgraded}/${crosscheckIds.length} upgraded from Blockfrost`);
  }

  // Metadata: keep Blockfrost metadata with 6h cache
  const needsMetaIds = drepIds.filter(d => !(useMetadataCache && cachedMeta[d.drep_id]));
  if (needsMetaIds.length > 0) {
    console.log(`  Metadata: ${needsMetaIds.length} need fetch, ${drepIds.length - needsMetaIds.length} cached`);
    await batchProcess(needsMetaIds, async (d) => {
      let name = null, image_url = null;
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
      return d;
    }, "Meta");
  }
  // Copy cached metadata
  for (const d of drepIds) {
    if (!newDrepMetadata[d.drep_id] && cachedMeta[d.drep_id]) {
      newDrepMetadata[d.drep_id] = cachedMeta[d.drep_id];
    }
  }

  // Build DRep array
  const dreps = drepIds.map(d => {
    const det = newDrepDetails[d.drep_id] || cachedDetails[d.drep_id] || {};
    const meta = newDrepMetadata[d.drep_id] || {};
    return {
      drep_id: d.drep_id,
      name: meta.name || null,
      amount: det.amount || "0",
      image_url: meta.image_url || null,
      delegators: det.delegators || 0,
      last_active_epoch: det.last_active_epoch || 0
    };
  }).filter(d => d.drep_id);
  dreps.sort((a, b) => Number(b.amount) - Number(a.amount));
  const newStakeRank = dreps.slice(0, 100).map(d => d.drep_id);
  console.log(`  Got ${dreps.length} DReps (stakes: ${detailFetchCount} fresh, ${detailCacheCount} cached)`);
  if (useMetadataCache) console.log(`  Metadata: ${Object.keys(cachedMeta).length} from cache, ${metadataFetchCount} fresh`);

  // ─── 3. DRep votes (3h cache) ────────────────────────────
  const VOTE_FRESH_MS = 3 * 60 * 60 * 1000;  // 3h between full vote refreshes
  const lastVoteFetch = cache.lastVoteFetchAt || 0;
  let votesFresh = (now - lastVoteFetch) < VOTE_FRESH_MS;
  // Safeguard: if cache has no active proposals, force a full refresh
  if (votesFresh && (!cache.activeProposalDetails || cache.activeProposalDetails.length === 0)) {
    console.log("  ⚠ No active proposals in cache — forcing vote refresh to discover new proposals");
    votesFresh = false;
  }
  console.log(`\n[3/9] DRep votes ${votesFresh ? "(CACHED — " + ((now - lastVoteFetch) / 60000).toFixed(0) + "min old, next refresh in " + ((VOTE_FRESH_MS - (now - lastVoteFetch)) / 60000).toFixed(0) + "min)" : "(refreshing)"}...`);

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
  // Restore cached vote counts and voted proposals for skip-runs
  if (votesFresh && cache.drepVoteCounts) Object.assign(drepVoteCounts, cache.drepVoteCounts);
  if (votesFresh && cache.drepVotedProposals) Object.assign(drepVotedProposals, cache.drepVotedProposals);
  console.log(`  Restored ${cachedVoteCount} cached DRep votes (expired + active)`);

  const typeMap = {
    "treasury_withdrawals": "TreasuryWithdrawals", "hard_fork_initiation": "HardForkInitiation",
    "parameter_change": "ParameterChange", "no_confidence": "NoConfidence",
    "update_committee": "UpdateCommittee", "new_constitution": "NewConstitution", "info_action": "InfoAction"
  };
  const allProposals = {};
  if (cache.proposalDetails) cache.proposalDetails.forEach(p => { allProposals[p.proposal_id] = p; });
  if (cache.activeProposalDetails) cache.activeProposalDetails.forEach(p => { allProposals[p.proposal_id] = p; });

  if (!votesFresh) {
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

  // ─── 3b. Discover all proposals via Blockfrost listing ─────
  // DRep votes only discover proposals that have been voted on.
  // Fetch the full proposal listing to catch new/unvoted proposals.
  console.log("  Discovering all proposals via /governance/proposals...");
  try {
    const allGovProposals = await fetchAllPages("/governance/proposals", 20);
    let discoveredNew = 0;
    for (const gp of allGovProposals) {
      const txHash = gp.tx_hash || "";
      const certIdx = gp.cert_index != null ? gp.cert_index : (gp.index != null ? gp.index : -1);
      if (!txHash) continue;
      const propKey = `${txHash}#${certIdx}`;
      if (!proposalSet[propKey]) {
        proposalSet[propKey] = { tx_hash: txHash, cert_index: certIdx };
        discoveredNew++;
      }
    }
    console.log(`  Blockfrost proposal listing: ${allGovProposals.length} total, ${discoveredNew} new (not found via DRep votes)`);
  } catch (e) {
    console.log(`  Proposal listing error: ${e.message}`);
  }

  // ─── 4. Proposal details ──────────────────────────────────
  console.log("\n[4/9] Fetching proposal details + metadata...");
  const cachedProposalIds = new Set(Object.keys(cache.proposals || {}));
  const newPropEntries = Object.entries(proposalSet).filter(([k]) => !cachedProposalIds.has(k));
  console.log(`  ${newPropEntries.length} new proposals (${cachedProposalIds.size} cached)`);

  const newProposals = await batchProcess(newPropEntries, async ([propKey, info]) => {
    let proposal_type = "", title = "", expiration = 0, status = "";
    let ratified_epoch = null, enacted_epoch = null, dropped_epoch = null, expired_epoch = null;
    try {
      const detail = await fetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}`);
      if (detail) {
        proposal_type = typeMap[detail.governance_type] || detail.governance_type || "";
        expiration = detail.expiration || 0;
        status = detail.status || "";
        ratified_epoch = detail.ratified_epoch || null;
        enacted_epoch = detail.enacted_epoch || null;
        dropped_epoch = detail.dropped_epoch || null;
        expired_epoch = detail.expired_epoch || null;
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
    return { proposal_id: propKey, tx_hash: info.tx_hash, cert_index: info.cert_index, proposal_type, title, expiration, epoch_no: expiration, status, ratified_epoch, enacted_epoch, dropped_epoch, expired_epoch };
  }, "Props");
  newProposals.forEach(p => { allProposals[p.proposal_id] = p; });

  } else {
    // Votes cached — skip vote + proposal fetch
    console.log("\n[4/9] Proposal details (using cache)...");
  } // end if (!votesFresh)

  const proposals = Object.values(allProposals);
  proposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
  console.log(`  Total proposals: ${proposals.length}`);

  // ─── Refresh proposal status for non-final proposals ───────
  // Final statuses (enacted, expired, dropped) don't change. Only refresh active/ratified/unknown.
  const FINAL_STATUSES = new Set(["enacted", "expired", "dropped"]);
  const statusToRefresh = proposals.filter(p => !FINAL_STATUSES.has(p.status));
  if (statusToRefresh.length > 0) {
    console.log(`  Refreshing status for ${statusToRefresh.length} non-final proposals (${proposals.length - statusToRefresh.length} already final)...`);
    let statusUpdated = 0;
    for (let si = 0; si < statusToRefresh.length; si++) {
      const p = statusToRefresh[si];
      try {
        const detail = await fetchJSON(`/governance/proposals/${p.tx_hash}/${p.cert_index}`);
        if (detail && detail.status) {
          const changed = detail.status !== p.status;
          p.status = detail.status;
          p.ratified_epoch = detail.ratified_epoch || null;
          p.enacted_epoch = detail.enacted_epoch || null;
          p.dropped_epoch = detail.dropped_epoch || null;
          p.expired_epoch = detail.expired_epoch || null;
          if (allProposals[p.proposal_id]) {
            Object.assign(allProposals[p.proposal_id], { status: p.status, ratified_epoch: p.ratified_epoch, enacted_epoch: p.enacted_epoch, dropped_epoch: p.dropped_epoch, expired_epoch: p.expired_epoch });
          }
          if (changed) statusUpdated++;
        }
      } catch (e) {}
      if ((si + 1) % 20 === 0 || si === statusToRefresh.length - 1) {
        console.log(`    [${si+1}/${statusToRefresh.length}] status checked (${statusUpdated} updated)`);
      }
    }
    console.log(`  Status refresh done: ${statusUpdated} updated`);
    const statusCounts = {};
    proposals.forEach(p => { const s = p.status || "unknown"; statusCounts[s] = (statusCounts[s] || 0) + 1; });
    console.log(`  Status breakdown: ${Object.entries(statusCounts).map(([k,v])=>`${k}=${v}`).join(", ")}`);
  }

  const proposalExpirations = {};
  proposals.forEach(p => { proposalExpirations[p.proposal_id] = p.expiration || 0; });

  // ─── 5. Build simulator data + update cache ───────────────
  console.log("\n[5/9] Building simulator data + updating cache...");
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
  const activeProposalDetails = proposals.filter(p => !(p.expiration > 0 && p.expiration < currentEpoch));
  console.log(`  DRep vote cache: ${Object.keys(expiredVotes).length} expired (permanent), ${Object.keys(activeVotes).length} active`);
  console.log(`  Proposal cache: ${expiredProposalDetails.length} expired, ${activeProposalDetails.length} active proposals`);
  // Note: saveCache moved to after CC section (step 7) to include all data

  // ─── 6. Stake history snapshot ──────────────────────────────
  console.log("\n[6/9] Updating stake history snapshot...");
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

  // ─── 7. CC (Constitutional Committee) data via Koios (3h cache) ──
  const CC_FRESH_MS = 3 * 60 * 60 * 1000;  // 3h between CC refreshes
  const lastCCFetch = cache.lastCCFetchAt || 0;
  const ccFresh = (now - lastCCFetch) < CC_FRESH_MS;
  console.log(`\n[8/9] CC data ${ccFresh ? "(CACHED — " + ((now - lastCCFetch) / 60000).toFixed(0) + "min old)" : "(refreshing)"}...`);

  let ccMembers = [];
  let ccVoteMap = {};
  let ccRationales = {};

  // Load cached CC votes (expired + active)
  const cachedCCExpired = cache.ccExpiredVotes || {};
  const cachedCCActive = cache.ccActiveVotes || {};
  const cachedCCRatExpired = cache.ccExpiredRationales || {};
  const cachedCCRatActive = cache.ccActiveRationales || {};
  Object.assign(ccVoteMap, cachedCCExpired, cachedCCActive);
  const refreshRationales = process.env.REFRESH_RATIONALES === "1";
  if (refreshRationales) {
    console.log("  REFRESH_RATIONALES=1: forcing re-download of all rationale content");
    // Keep only URLs, strip cached text so everything gets re-downloaded
    const stripText = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === "object" && v.url ? v.url : v;
      }
      return out;
    };
    Object.assign(ccRationales, stripText(cachedCCRatExpired), stripText(cachedCCRatActive));
  } else {
    Object.assign(ccRationales, cachedCCRatExpired, cachedCCRatActive);
  }
  let ccCachedCount = Object.keys(cachedCCExpired).length + Object.keys(cachedCCActive).length;
  if (ccCachedCount > 0) {
    console.log(`  Restored ${ccCachedCount} cached CC votes (${Object.keys(cachedCCExpired).length} expired, ${Object.keys(cachedCCActive).length} active)`);
  }

  if (ccFresh && cache.ccMembers && cache.ccMembers.length > 0) {
    // Use cached CC data
    ccMembers = cache.ccMembers;
    console.log(`  Using cached CC: ${ccMembers.length} members, ${Object.keys(ccVoteMap).length} votes`);
  } else {
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
            const rKey = `${shortHash}__${proposalId}`;
            // Don't overwrite already-downloaded content (object with .text)
            if (rUrl && !(typeof ccRationales[rKey] === "object" && "text" in ccRationales[rKey])) {
              ccRationales[rKey] = rUrl;
            }
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
    if (cache.ccMembers && cache.ccMembers.length > 0) ccMembers = cache.ccMembers;
  }
  } // end if (!ccFresh)

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
  // Generic batch downloader for rationale content (used for both CC and DRep)
  async function downloadRationales(rationales, label) {
    const entries = Object.entries(rationales);
    const toDownload = [];
    let cached = 0;
    const result = {};

    for (const [key, val] of entries) {
      if (typeof val === "object" && "text" in val) {
        // Already downloaded (or attempted) — keep as-is, don't re-download
        result[key] = val;
        cached++;
      } else {
        // String URL or {url} without text → needs downloading
        toDownload.push([key, typeof val === "string" ? val : (val.url || String(val))]);
      }
    }

    if (toDownload.length === 0) {
      console.log(`  ${label}: ${cached} cached, 0 to download`);
      return result;
    }
    console.log(`  ${label}: downloading ${toDownload.length} (${cached} cached)...`);

    let downloaded = 0, dlFailed = 0;
    // Process in parallel batches of 10
    const BATCH = 10;
    for (let i = 0; i < toDownload.length; i += BATCH) {
      const batch = toDownload.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async ([key, url]) => {
        try {
          const r = await fetchRationaleContent(url);
          if (r) return [key, r, true];
          return [key, { url: resolveIpfsUrl(url), text: "" }, false];
        } catch {
          return [key, { url: resolveIpfsUrl(url), text: "" }, false];
        }
      }));
      for (const [key, val, ok] of results) {
        result[key] = val;
        if (ok) downloaded++; else dlFailed++;
      }
      if ((i + BATCH) % 50 < BATCH) {
        console.log(`    ${label} progress: ${Math.min(i + BATCH, toDownload.length)}/${toDownload.length} (${downloaded} ok, ${dlFailed} fail)`);
      }
    }
    console.log(`  ${label}: ${downloaded} downloaded, ${cached} cached, ${dlFailed} failed`);
    return result;
  }

  if (Object.keys(ccRationales).length > 0) {
    const ccRationaleContent = await downloadRationales(ccRationales, "CC rationales");
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
  if (refreshRationales) {
    const stripText = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === "object" && v.url ? v.url : v;
      }
      return out;
    };
    Object.assign(drepRationales, stripText(cachedDrepRatExpired), stripText(cachedDrepRatActive));
  } else {
    Object.assign(drepRationales, cachedDrepRatExpired, cachedDrepRatActive);
  }
  const drepRatCachedCount = Object.keys(drepRationales).length;
  if (drepRatCachedCount > 0) {
    console.log(`\n  Restored ${drepRatCachedCount} cached DRep rationales`);
  }

  // Skip entirely when votes are cached (no new votes = no new rationale URLs)
  if (votesFresh) {
    console.log("\n  DRep rationale URLs: SKIPPED (votes cached, no new rationales possible)");
  } else {
    try {
      console.log("\n  Fetching DRep rationale URLs via Koios proposal_votes...");

      // Only fetch for ACTIVE proposals (expired rationales are immutable)
      const activeProposals = proposals.filter(p => {
        const exp = p.expiration || 0;
        return !(exp > 0 && exp < currentEpoch);
      });
      const skippedExpired = proposals.length - activeProposals.length;

      if (activeProposals.length === 0) {
        console.log(`    No active proposals to fetch rationales for (${skippedExpired} expired, cached)`);
      } else {
        // Use cached bech32Map if available, otherwise fetch /proposal_list
        let bech32Map = cache.bech32Map || {};
        const cachedMapSize = Object.keys(bech32Map).length;
        // Check if any active proposals are missing from the cached map
        const missingFromMap = activeProposals.filter(p => !bech32Map[p.proposal_id]);
        if (missingFromMap.length > 0 || cachedMapSize === 0) {
          console.log(`    Refreshing bech32Map (${missingFromMap.length} proposals missing from ${cachedMapSize} cached entries)`);
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
          for (const kp of allKoiosProposals) {
            if (kp.proposal_tx_hash && kp.proposal_index != null && kp.proposal_id) {
              bech32Map[`${kp.proposal_tx_hash}#${kp.proposal_index}`] = kp.proposal_id;
            }
          }
        } else {
          console.log(`    bech32Map: using ${cachedMapSize} cached entries`);
        }

        const propsToFetch = activeProposals.filter(p => bech32Map[p.proposal_id]);
        console.log(`    Active proposals: ${propsToFetch.length} to fetch (${skippedExpired} expired skipped)`);

        let drepRatUrlCount = 0;
        for (const p of propsToFetch) {
          const bech32Id = bech32Map[p.proposal_id];
          if (!bech32Id) continue;
          try {
            let allVotes = [];
            let vOffset = 0;
            while (true) {
              const votes = await koiosGet("/proposal_votes", { _proposal_id: bech32Id, offset: vOffset, limit: 500 });
              if (!votes || votes.length === 0) break;
              allVotes = allVotes.concat(votes);
              if (votes.length < 500) break;
              vOffset += 500;
            }
            for (const v of allVotes) {
              if (v.voter_role === "DRep" && v.meta_url) {
                const metaUrl = typeof v.meta_url === "object" ? v.meta_url.url : v.meta_url;
                if (metaUrl && v.voter_id) {
                  const key = `${v.voter_id}__${p.proposal_id}`;
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

        // Save bech32Map to cache for future runs
        cache.bech32Map = bech32Map;
      }
    } catch (e) {
      console.log(`    DRep rationale fetch error: ${e.message}`);
    }
  }

  // Step 3: Download DRep rationale content (reuse batch downloader)
  if (Object.keys(drepRationales).length > 0) {
    const drepRatContent = await downloadRationales(drepRationales, "DRep rationales");
    Object.assign(drepRationales, drepRatContent);
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

  // ─── 7e. SPO votes + pool info (Koios) ─────────────────────
  console.log("\n  [SPO] Fetching SPO votes + pool info via Koios...");
  // Separate active and expired proposals
  const spoActiveProposals = proposals.filter(p => p.proposal_type && (!p.expiration || currentEpoch <= p.expiration));
  const spoExpiredProposals = proposals.filter(p => p.proposal_type && p.expiration && currentEpoch > p.expiration);
  console.log(`  SPO proposals: ${spoActiveProposals.length} active, ${spoExpiredProposals.length} expired / ${proposals.length} total`);

  let spoVoteMap = {};
  let spoPoolInfo = {};

  // Load cached SPO data (split into expired permanent + active refresh)
  const cachedSpoExpiredVotes = cache.spoExpiredVotes || {};
  const cachedSpoActiveVotes = cache.spoActiveVotes || {};
  const cachedSpoPoolInfo = cache.spoPoolInfo || {};
  const SPO_FRESH_MS = 3 * 3600000; // 3 hours
  const lastSpoFetch = cache.lastSpoFetchAt || 0;
  let spoFresh = (now - lastSpoFetch) < SPO_FRESH_MS;

  // Migrate from old single spoVoteMap if needed
  if (Object.keys(cachedSpoExpiredVotes).length === 0 && cache.spoVoteMap && Object.keys(cache.spoVoteMap).length > 0) {
    console.log("  Migrating old spoVoteMap to split expired/active cache...");
    const expiredPropIds = new Set(spoExpiredProposals.map(p => p.proposal_id));
    for (const [key, val] of Object.entries(cache.spoVoteMap)) {
      const propId = key.split("__")[1];
      if (expiredPropIds.has(propId)) cachedSpoExpiredVotes[key] = val;
      else cachedSpoActiveVotes[key] = val;
    }
    console.log(`  Migrated: ${Object.keys(cachedSpoExpiredVotes).length} expired, ${Object.keys(cachedSpoActiveVotes).length} active`);
  }

  // Restore expired SPO votes (permanent — never re-fetch)
  let spoExpiredVotes = { ...cachedSpoExpiredVotes };
  const cachedExpiredPropIds = new Set(Object.keys(cachedSpoExpiredVotes).map(k => k.split("__")[1]));
  const expiredUncachedSpo = spoExpiredProposals.filter(p => !cachedExpiredPropIds.has(p.proposal_id));
  console.log(`  SPO expired votes: ${Object.keys(cachedSpoExpiredVotes).length} cached, ${expiredUncachedSpo.length} uncached expired proposals to fetch`);

  // Safeguard: if cached SPO data doesn't cover most active proposals, force refresh
  if (spoFresh && spoActiveProposals.length > 0) {
    const cachedActiveProps = new Set(Object.keys(cachedSpoActiveVotes).map(k => k.split("__")[1]));
    if (cachedActiveProps.size < spoActiveProposals.length / 2) {
      console.log(`  ⚠ SPO cache has votes for only ${cachedActiveProps.size}/${spoActiveProposals.length} active proposals — forcing refresh`);
      spoFresh = false;
    }
  }
  // Also refresh SPO when votes were refreshed (new proposals may exist)
  if (spoFresh && !votesFresh) {
    console.log("  ⚠ Votes were refreshed this run — also refreshing SPO data");
    spoFresh = false;
  }

  // Combine proposals to fetch: active (if not fresh) + expired uncached
  const spoPropsToFetch = [];
  if (!spoFresh) spoPropsToFetch.push(...spoActiveProposals);
  spoPropsToFetch.push(...expiredUncachedSpo);

  if (spoFresh && expiredUncachedSpo.length === 0) {
    spoVoteMap = { ...cachedSpoExpiredVotes, ...cachedSpoActiveVotes };
    spoPoolInfo = cachedSpoPoolInfo;
    console.log(`  SPO data CACHED (${((now - lastSpoFetch) / 60000).toFixed(0)}min old): ${Object.keys(spoVoteMap).length} votes, ${Object.keys(spoPoolInfo).length} pools`);
  } else if (spoPropsToFetch.length === 0) {
    spoVoteMap = { ...cachedSpoExpiredVotes };
    console.log(`  No SPO proposals to fetch, using ${Object.keys(spoVoteMap).length} expired cached votes`);
  } else {
    try {
      // Ensure bech32Map has all proposals — refresh if any are missing
      let spoBech32Map = cache.bech32Map || {};
      const missingBech32 = spoPropsToFetch.filter(p => !spoBech32Map[p.proposal_id]);
      if (missingBech32.length > 0 || Object.keys(spoBech32Map).length === 0) {
        console.log(`  Refreshing bech32Map for SPO (${missingBech32.length} proposals missing)...`);
        let allKP = [];
        let kOff = 0;
        while (true) {
          const page = await koiosGet("/proposal_list", { offset: kOff, limit: 500 });
          if (!page || page.length === 0) break;
          allKP = allKP.concat(page);
          if (page.length < 500) break;
          kOff += 500;
        }
        for (const kp of allKP) {
          if (kp.proposal_tx_hash && kp.proposal_index != null && kp.proposal_id) {
            spoBech32Map[`${kp.proposal_tx_hash}#${kp.proposal_index}`] = kp.proposal_id;
          }
        }
        cache.bech32Map = spoBech32Map;
        console.log(`  bech32Map updated: ${Object.keys(spoBech32Map).length} entries`);
      }

      // Step 1: Fetch SPO votes per eligible proposal
      // Deduplicate proposals to avoid fetching same proposal multiple times
      const seenProposalIds = new Set();
      const uniqueSpoProposals = [];
      for (const p of spoPropsToFetch) {
        if (!seenProposalIds.has(p.proposal_id)) {
          seenProposalIds.add(p.proposal_id);
          uniqueSpoProposals.push(p);
        }
      }
      if (uniqueSpoProposals.length < spoPropsToFetch.length) {
        console.log(`  Deduplicated: ${spoPropsToFetch.length} → ${uniqueSpoProposals.length} unique proposals`);
      }

      let spoVoteCount = 0;
      const votingPoolIds = new Set(); // Track pools that voted (for targeted info fetch)
      for (let i = 0; i < uniqueSpoProposals.length; i++) {
        const p = uniqueSpoProposals[i];
        const bech32Id = spoBech32Map[p.proposal_id];
        if (!bech32Id) {
          console.log(`    No bech32 ID for ${p.proposal_id.slice(0,16)}…, skipping`);
          continue;
        }
        try {
          let allVotes = [];
          let vOffset = 0;
          while (true) {
            const votes = await koiosGet("/proposal_votes", { _proposal_id: bech32Id, offset: vOffset, limit: 500 });
            if (!votes || votes.length === 0) break;
            allVotes = allVotes.concat(votes);
            if (votes.length < 500) break;
            vOffset += 500;
          }
          const spoVotes = allVotes.filter(v => v.voter_role === "SPO");
          for (const v of spoVotes) {
            let vote = (v.vote || "").charAt(0).toUpperCase() + (v.vote || "").slice(1).toLowerCase();
            if (!["Yes","No","Abstain"].includes(vote)) continue;
            spoVoteMap[`${v.voter_id}__${p.proposal_id}`] = vote;
            votingPoolIds.add(v.voter_id);
            spoVoteCount++;
          }
          console.log(`    [${i+1}/${uniqueSpoProposals.length}] ${p.proposal_id.slice(0,16)}…: ${spoVotes.length} SPO votes (of ${allVotes.length} total)`);
        } catch (e) {
          console.log(`    Error fetching SPO votes for ${p.proposal_id.slice(0,16)}…: ${e.message}`);
        }
      }
      console.log(`  SPO votes: ${spoVoteCount} total from ${votingPoolIds.size} pools`);

      // Step 2: Fetch pool info ONLY for pools that actually voted (not all ~3000 registered pools)
      // This dramatically reduces API calls from ~60+ (all pools) to just a few batches
      const poolsToFetch = [...votingPoolIds].filter(pid => !cachedSpoPoolInfo[pid]);
      const poolsFromCache = votingPoolIds.size - poolsToFetch.length;
      console.log(`  Pool info needed: ${votingPoolIds.size} voting pools (${poolsFromCache} cached, ${poolsToFetch.length} to fetch)`);

      // Start with cached pool info for known pools
      for (const [pid, info] of Object.entries(cachedSpoPoolInfo)) {
        if (votingPoolIds.has(pid)) spoPoolInfo[pid] = info;
      }

      if (poolsToFetch.length > 0) {
        // Fetch pool info in batches
        const POOL_BATCH = 50;
        for (let i = 0; i < poolsToFetch.length; i += POOL_BATCH) {
          const batch = poolsToFetch.slice(i, i + POOL_BATCH);
          try {
            const data = await koiosPost("/pool_info", { _pool_bech32_ids: batch });
            if (data) data.forEach(p => {
              if (p.pool_id_bech32) {
                spoPoolInfo[p.pool_id_bech32] = {
                  ticker: p.ticker || "",
                  reward_addr: p.reward_addr || "",
                  pledge_drep: null, // Will be filled in Step 3
                  active_stake: p.active_stake || p.live_stake || "0"
                };
              }
            });
          } catch (e) { console.log(`    pool_info batch error: ${e.message}`); }
        }
        console.log(`  Pool info fetched: ${Object.keys(spoPoolInfo).length} pools`);

        // Step 3: Bulk-check DRep delegation for pledge addresses of newly fetched pools only
        const newRewardAddrs = [...new Set(
          poolsToFetch.map(pid => spoPoolInfo[pid]?.reward_addr).filter(Boolean)
        )];
        if (newRewardAddrs.length > 0) {
          console.log(`  Checking DRep delegation for ${newRewardAddrs.length} new reward addresses...`);
          const addrToDrep = {};
          const ACCT_BATCH = 50;
          for (let i = 0; i < newRewardAddrs.length; i += ACCT_BATCH) {
            const batch = newRewardAddrs.slice(i, i + ACCT_BATCH);
            try {
              const data = await koiosPost("/account_info", { _stake_addresses: batch });
              if (data) data.forEach(a => { if (a.stake_address) addrToDrep[a.stake_address] = a.delegated_drep || null; });
            } catch (e) { console.log(`    account_info batch error: ${e.message}`); }
          }
          // Apply delegation info to pool info
          for (const pid of poolsToFetch) {
            if (spoPoolInfo[pid] && spoPoolInfo[pid].reward_addr) {
              spoPoolInfo[pid].pledge_drep = addrToDrep[spoPoolInfo[pid].reward_addr] || null;
            }
          }
          const drepCount = Object.values(addrToDrep).filter(v => v).length;
          console.log(`  Delegation: ${drepCount}/${newRewardAddrs.length} have DRep delegation`);
        }
      }
      console.log(`  SPO pool info built: ${Object.keys(spoPoolInfo).length} pools`);

      // Split newly fetched votes into expired (permanent) and active
      const expiredPropIds = new Set(spoExpiredProposals.map(p => p.proposal_id));
      for (const [key, val] of Object.entries(spoVoteMap)) {
        const propId = key.split("__")[1];
        if (expiredPropIds.has(propId)) spoExpiredVotes[key] = val;
      }
      // Merge: expired (permanent) + freshly fetched active
      spoVoteMap = { ...spoExpiredVotes, ...spoVoteMap };
      console.log(`  SPO total: ${Object.keys(spoVoteMap).length} votes (${Object.keys(spoExpiredVotes).length} expired permanent)`);
    } catch (e) {
      console.log(`  SPO data fetch error: ${e.message}`);
      // Fall back to cached data if available
      const fallback = { ...cachedSpoExpiredVotes, ...cachedSpoActiveVotes };
      if (Object.keys(fallback).length > 0) {
        spoVoteMap = fallback;
        spoPoolInfo = cachedSpoPoolInfo;
        console.log(`  Falling back to cached SPO data: ${Object.keys(spoVoteMap).length} votes`);
      }
    }
  }

  // ─── 7f. Protocol Parameters & Network Info ──────────────────
  console.log("\n[7/9] Fetching protocol parameters & network info...");
  let protocolParams = {};
  let networkInfo = {};
  try {
    const params = await fetchJSON("/epochs/latest/parameters");
    if (params) {
      protocolParams = {
        // Governance thresholds (DRep)
        dvt_motion_no_confidence: params.dvt_motion_no_confidence,
        dvt_committee_normal: params.dvt_committee_normal,
        dvt_committee_no_confidence: params.dvt_committee_no_confidence,
        dvt_update_to_constitution: params.dvt_update_to_constitution,
        dvt_hard_fork_initiation: params.dvt_hard_fork_initiation,
        dvt_p_p_network_group: params.dvt_p_p_network_group,
        dvt_p_p_economic_group: params.dvt_p_p_economic_group,
        dvt_p_p_technical_group: params.dvt_p_p_technical_group,
        dvt_p_p_gov_group: params.dvt_p_p_gov_group,
        dvt_treasury_withdrawal: params.dvt_treasury_withdrawal,
        // SPO thresholds
        pvt_motion_no_confidence: params.pvt_motion_no_confidence,
        pvt_committee_normal: params.pvt_committee_normal,
        pvt_committee_no_confidence: params.pvt_committee_no_confidence,
        pvt_hard_fork_initiation: params.pvt_hard_fork_initiation,
        pvt_p_p_security_group: params.pvt_p_p_security_group,
        // Key protocol params
        min_fee_a: params.min_fee_a,
        min_fee_b: params.min_fee_b,
        max_block_size: params.max_block_size,
        max_tx_size: params.max_tx_size,
        max_block_header_size: params.max_block_header_size,
        key_deposit: params.key_deposit,
        pool_deposit: params.pool_deposit,
        drep_deposit: params.drep_deposit,
        gov_action_deposit: params.gov_action_deposit,
        min_pool_cost: params.min_pool_cost,
        protocol_major_ver: params.protocol_major_ver,
        protocol_minor_ver: params.protocol_minor_ver,
        committee_min_size: params.committee_min_size,
        committee_max_term_length: params.committee_max_term_length,
        gov_action_lifetime: params.gov_action_lifetime,
        drep_activity: params.drep_activity,
        max_collateral_inputs: params.max_collateral_inputs,
        coins_per_utxo_size: params.coins_per_utxo_size,
        cost_models: undefined, // too large, skip
        price_mem: params.price_mem,
        price_step: params.price_step,
        max_tx_ex_mem: params.max_tx_ex_mem,
        max_tx_ex_steps: params.max_tx_ex_steps,
        max_block_ex_mem: params.max_block_ex_mem,
        max_block_ex_steps: params.max_block_ex_steps,
        max_val_size: params.max_val_size,
        a0: params.a0,
        rho: params.rho,
        tau: params.tau,
        decentralisation_param: params.decentralisation_param,
        extra_entropy: params.extra_entropy,
        collateral_percent: params.collateral_percent,
        epoch: params.epoch
      };
      console.log(`  Protocol params: epoch ${params.epoch}, protocol v${params.protocol_major_ver}.${params.protocol_minor_ver}`);
    }
  } catch (e) { console.log(`  Protocol params fetch error: ${e.message}`); }

  try {
    const net = await fetchJSON("/network");
    if (net && net.stake) {
      networkInfo = {
        supply_total: net.supply?.total || "0",
        supply_circulating: net.supply?.circulating || "0",
        supply_locked: net.supply?.locked || "0",
        supply_treasury: net.supply?.treasury || "0",
        supply_reserves: net.supply?.reserves || "0",
        stake_live: net.stake?.live || "0",
        stake_active: net.stake?.active || "0"
      };
      console.log(`  Network: treasury=${(Number(networkInfo.supply_treasury)/1e12).toFixed(2)}B ADA`);
    }
  } catch (e) { console.log(`  Network info fetch error: ${e.message}`); }

  // ─── 7g. Fetch proposal voting summaries from Koios ──────────────
  // Uses /proposal_voting_summary for authoritative on-chain tallies
  // (includes non-voter "No" counting, auto-drep handling, etc.)
  const proposalSummaries = {};
  const bech32Map = cache.bech32Map || {};

  // Restore cached expired proposal summaries (immutable — never re-fetch)
  const cachedSummaries = cache.proposalSummaries || {};
  let restoredCount = 0;
  for (const prop of proposals) {
    if (prop.expiration && prop.expiration < currentEpoch && cachedSummaries[prop.proposal_id]) {
      proposalSummaries[prop.proposal_id] = cachedSummaries[prop.proposal_id];
      restoredCount++;
    }
  }

  // Fetch voting summaries for:
  //  1. Active proposals (always refresh — votes can change)
  //  2. Expired proposals NOT yet in cache (one-time fetch, then cached permanently)
  const activePropsForSummary = proposals.filter(p => bech32Map[p.proposal_id] && (!p.expiration || currentEpoch <= p.expiration));
  const expiredUncached = proposals.filter(p => bech32Map[p.proposal_id] && p.expiration && p.expiration < currentEpoch && !cachedSummaries[p.proposal_id]);
  const summaryProposals = [...activePropsForSummary, ...expiredUncached];
  const summarySkipped = proposals.length - summaryProposals.length;
  console.log(`  Voting summaries: ${restoredCount} restored from cache, fetching ${activePropsForSummary.length} active + ${expiredUncached.length} expired-uncached via Koios (${summarySkipped} already cached)...`);
  let summaryOk = 0, summaryFail = 0;

  const parseSummary = (s) => ({
    proposal_type: s.proposal_type,
    drep: {
      yes_pct: Number(s.drep_yes_pct) || 0,
      no_pct: Number(s.drep_no_pct) || 0,
      yes_votes_cast: Number(s.drep_yes_votes_cast) || 0,
      no_votes_cast: Number(s.drep_no_votes_cast) || 0,
      abstain_votes_cast: Number(s.drep_abstain_votes_cast) || 0,
      yes_power: s.drep_yes_vote_power || "0",
      no_power: s.drep_no_vote_power || "0",
    },
    cc: {
      yes_pct: Number(s.committee_yes_pct) || 0,
      no_pct: Number(s.committee_no_pct) || 0,
      yes_votes_cast: Number(s.committee_yes_votes_cast) || 0,
      no_votes_cast: Number(s.committee_no_votes_cast) || 0,
      abstain_votes_cast: Number(s.committee_abstain_votes_cast) || 0,
    },
    spo: {
      yes_pct: Number(s.pool_yes_pct) || 0,
      no_pct: Number(s.pool_no_pct) || 0,
      yes_votes_cast: Number(s.pool_yes_votes_cast) || 0,
      no_votes_cast: Number(s.pool_no_votes_cast) || 0,
      abstain_votes_cast: Number(s.pool_abstain_votes_cast) || 0,
      yes_power: s.pool_yes_vote_power || "0",
      no_power: s.pool_no_vote_power || "0",
    }
  });

  for (let si = 0; si < summaryProposals.length; si++) {
    const prop = summaryProposals[si];
    const bech32Id = bech32Map[prop.proposal_id];
    const isExpired = prop.expiration && prop.expiration < currentEpoch;
    try {
      const result = await koiosGet("/proposal_voting_summary", { _proposal_id: bech32Id });
      if (Array.isArray(result) && result.length > 0) {
        proposalSummaries[prop.proposal_id] = parseSummary(result[0]);
        summaryOk++;
      }
      if ((si + 1) % 10 === 0 || si === summaryProposals.length - 1) {
        console.log(`    [${si+1}/${summaryProposals.length}] summaries fetched (${summaryOk} ok, ${summaryFail} fail)`);
      }
    } catch (e) {
      summaryFail++;
      console.log(`    [${si+1}/${summaryProposals.length}] FAIL ${prop.proposal_id.slice(0,16)}… ${isExpired?"(expired)":"(active)"}: ${e.message}`);
    }
  }
  console.log(`  Voting summaries: ${summaryOk} fetched, ${summaryFail} failed, ${restoredCount} from cache = ${Object.keys(proposalSummaries).length} total`);

  // ─── Save unified cache ────────────────────────────────────
  saveCache({
    expiredVotes,
    activeVotes,
    proposals: { ...proposalSet },
    proposalDetails: expiredProposalDetails,
    activeProposalDetails,
    drepVoteCounts, drepVotedProposals,
    drepMetadata: newDrepMetadata,
    drepMetadataUpdatedAt: useMetadataCache ? cache.drepMetadataUpdatedAt : Date.now(),
    drepDetails: newDrepDetails,
    drepStakeRank: newStakeRank,
    ccExpiredVotes, ccExpiredRationales,
    ccActiveVotes, ccActiveRationales,
    drepExpiredRationales, drepActiveRationales,
    bech32Map: cache.bech32Map || {},
    spoExpiredVotes: (() => {
      const ev = {};
      const expPropIds = new Set(proposals.filter(p => p.expiration && currentEpoch > p.expiration).map(p => p.proposal_id));
      for (const [k, v] of Object.entries(spoVoteMap)) { if (expPropIds.has(k.split("__")[1])) ev[k] = v; }
      return ev;
    })(),
    spoActiveVotes: (() => {
      const av = {};
      const expPropIds = new Set(proposals.filter(p => p.expiration && currentEpoch > p.expiration).map(p => p.proposal_id));
      for (const [k, v] of Object.entries(spoVoteMap)) { if (!expPropIds.has(k.split("__")[1])) av[k] = v; }
      return av;
    })(),
    spoPoolInfo,
    lastSpoFetchAt: (spoFresh && expiredUncachedSpo.length === 0) ? lastSpoFetch : now,
    proposalSummaries,
    ccMembers,
    currentEpoch,
    lastVoteFetchAt: votesFresh ? lastVoteFetch : now,
    lastCCFetchAt: ccFresh ? lastCCFetch : now
  });

  // ─── 9. Write output files ────────────────────────────────
  console.log("\n[9/9] Writing JSON files...");
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
    metadata_from_cache: useMetadataCache,
    stake_source: "koios_live",
    votes_from_cache: votesFresh,
    cc_from_cache: ccFresh,
    spo_from_cache: spoFresh,
    spo_vote_count: Object.keys(spoVoteMap).length,
    spo_pool_count: Object.keys(spoPoolInfo).length
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

  // Write SPO data
  if (Object.keys(spoVoteMap).length > 0) {
    fs.writeFileSync(path.join(DATA_DIR, "spo-votes.json"), JSON.stringify(spoVoteMap));
    fs.writeFileSync(path.join(DATA_DIR, "spo-pools.json"), JSON.stringify(spoPoolInfo));
    console.log(`  SPO: ${Object.keys(spoVoteMap).length} votes, ${Object.keys(spoPoolInfo).length} pools written`);
  }

  // Write DRep rationales
  if (Object.keys(drepRationales).length > 0) {
    fs.writeFileSync(path.join(DATA_DIR, "drep-rationales.json"), JSON.stringify(drepRationales));
    console.log(`  DRep rationales: ${Object.keys(drepRationales).length} written`);
  }

  // Write protocol params and governance info
  fs.writeFileSync(path.join(DATA_DIR, "protocol-params.json"), JSON.stringify(protocolParams, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, "governance-info.json"), JSON.stringify({ network: networkInfo, protocolParams, proposalSummaries }, null, 2));
  console.log(`  protocol-params.json and governance-info.json written`);

  const files = ["dreps.json", "proposals.json", "votes.json", "simulator.json", "meta.json", "vote-cache.json", "drep-history.json", "cc-members.json", "cc-votes.json", "cc-rationales.json", "drep-rationales.json", "spo-votes.json", "spo-pools.json", "protocol-params.json", "governance-info.json"];
  files.forEach(f => {
    try { const size = fs.statSync(path.join(DATA_DIR, f)).size; console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`); } catch (e) {}
  });

  console.log(`\n=== Done! ===`);
  console.log(`API calls: ${apiCalls}${useMetadataCache ? " (metadata cached)" : ""}`);
  console.log(`DRep votes: ${Object.keys(voteMap).length} (${cachedVoteCount} from cache)`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
