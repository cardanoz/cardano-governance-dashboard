#!/usr/bin/env node
/**
 * X (Twitter) Data Collector for Cardano DRep Hub Digest
 *
 * Two-tier collection strategy:
 *   Tier 1: Monitor key accounts (full tweet capture)
 *   Tier 2: Keyword searches with noise exclusion
 *
 * Uses TwitterAPI.io (https://twitterapi.io)
 *   - GET /twitter/user/last_tweets  — account monitoring
 *   - GET /twitter/tweet/advanced_search — keyword search
 *
 * Output: data/x-raw-tweets.json (raw collected tweets, deduplicated)
 *
 * Usage: TWITTER_API_KEY=xxx node scripts/collect-x-digest.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TWITTER_API_KEY;
if (!API_KEY) {
  console.error("ERROR: TWITTER_API_KEY environment variable is required");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data");

// ─── Tier 1: Trigger Accounts ───────────────────────────────────────────────

const TIER1_ACCOUNTS = [
  // ── Institutional / Official ──
  { username: "InputOutputHK", category: "institutional", label: "IOG" },
  { username: "IOGroup", category: "institutional", label: "IO Group" },
  { username: "Cardano", category: "institutional", label: "Cardano Official" },
  { username: "Cardano_CF", category: "institutional", label: "Cardano Foundation" },
  { username: "IntersectMBO", category: "institutional", label: "Intersect" },
  { username: "emurgo_io", category: "institutional", label: "EMURGO" },
  { username: "Catalyst_onX", category: "institutional", label: "Project Catalyst" },
  { username: "midnightfdn", category: "institutional", label: "Midnight Foundation" },
  { username: "MidnightNtwrk", category: "institutional", label: "Midnight Network" },
  { username: "RareEvo", category: "institutional", label: "RareEvo" },
  // ── Key Persons ──
  { username: "IOHK_Charles", category: "key_person", label: "Charles Hoskinson" },
  { username: "SebastienGllmt", category: "key_person", label: "dcSpark/Paima" },
  { username: "phillip_pon", category: "key_person", label: "Phillip (IOG)" },
  { username: "lara_bcw", category: "key_person", label: "Lara (Blockchain Women)" },
  { username: "NicolasC3rny", category: "key_person", label: "Nicolas Cerny" },
  { username: "KylixAfonso", category: "key_person", label: "Kylix Afonso" },
  { username: "MauroAndreoliA", category: "key_person", label: "Mauro Andreoli" },
  { username: "CardanoRami", category: "key_person", label: "Cardano Rami" },
  { username: "MicheleHarmonic", category: "key_person", label: "Michele (Harmonic)" },
  { username: "phil_uplc", category: "key_person", label: "Phil UPLC" },
  { username: "DeOpenSourceGuy", category: "key_person", label: "De Open Source Guy" },
  { username: "planetmaaz", category: "key_person", label: "Planet Maaz" },
  { username: "rafaelfraga_f", category: "key_person", label: "Rafael Fraga" },
  { username: "Ryun1_", category: "key_person", label: "Ryun1" },
  { username: "taichiyokoyama", category: "key_person", label: "Taichi Yokoyama" },
  // ── Governance / DRep / CC ──
  { username: "GovToolCardano", category: "governance_tool", label: "GovTool" },
  { username: "laboradorace_io", category: "governance_tool", label: "Lace Wallet" },
  { username: "intertreeJK", category: "governance_tool", label: "InterTree JK" },
  { username: "cardanocuria", category: "governance_tool", label: "Cardano Curia" },
  { username: "gravitycardano", category: "governance_tool", label: "Gravity Cardano" },
  { username: "IntersectCIVICS", category: "governance_tool", label: "Intersect CIVICS" },
  { username: "tingvard", category: "governance_tool", label: "Tingvard" },
  { username: "governancevote", category: "governance_tool", label: "Governance Vote" },
  { username: "Intersect_MCC", category: "governance_tool", label: "Intersect MCC" },
  { username: "IntersectOSO", category: "governance_tool", label: "Intersect OSO" },
  { username: "tempo_vote", category: "governance_tool", label: "Tempo Vote" },
  { username: "clarity_dao", category: "governance_tool", label: "Clarity DAO" },
  { username: "shieldedtech", category: "governance_tool", label: "Shielded Tech" },
  // ── SPO / Regional ──
  { username: "CardanoSPO", category: "spo", label: "SPO Community" },
  { username: "SmaugPool", category: "spo", label: "Smaug Pool" },
  { username: "SIPO_Tokyo", category: "spo", label: "SIPO Tokyo" },
  { username: "AichiStakePool", category: "spo", label: "Aichi Stake Pool" },
  { username: "HephyPool", category: "spo", label: "Hephy Pool" },
  { username: "JapanCardano", category: "spo", label: "Japan Cardano" },
  { username: "EasternCardano", category: "spo", label: "Eastern Cardano" },
  { username: "CardanoAtlantic", category: "spo", label: "Cardano Atlantic" },
  // ── Dev Tools / Builder ──
  { username: "blockfrost_io", category: "dev_tools", label: "Blockfrost" },
  { username: "builder__dao", category: "dev_tools", label: "Builder DAO" },
  { username: "sidan_lab", category: "dev_tools", label: "Sidan Lab" },
  { username: "meshsdk", category: "dev_tools", label: "Mesh SDK" },
  { username: "AnastasiaLabs", category: "dev_tools", label: "Anastasia Labs" },
  { username: "txpipe_tools", category: "dev_tools", label: "TxPipe" },
  { username: "DemeterRun", category: "dev_tools", label: "Demeter Run" },
  { username: "TapTools", category: "dev_tools", label: "TapTools" },
  { username: "lantr_io", category: "dev_tools", label: "Lantr" },
  { username: "zkFold", category: "dev_tools", label: "zkFold" },
  { username: "midnightexplr", category: "dev_tools", label: "Midnight Explorer" },
  // ── Ecosystem / DeFi / Adoption ──
  { username: "SyncAI_Network", category: "ecosystem_adoption", label: "SyncAI Network" },
  { username: "MinswapIntern", category: "ecosystem_adoption", label: "Minswap" },
  { username: "AnzensOfficial", category: "ecosystem_adoption", label: "Anzens" },
  { username: "USDMOfficial", category: "ecosystem_adoption", label: "USDM" },
  { username: "snek", category: "ecosystem_adoption", label: "SNEK" },
];

// ─── Tier 2: Keyword Searches ───────────────────────────────────────────────

const TIER2_SEARCHES = [
  {
    category: "governance_action",
    label: "GA & Voting",
    query: 'cardano ("governance action" OR "gov action" OR "drep vote" OR "on-chain vote") -airdrop -giveaway -price -is:retweet',
  },
  {
    category: "constitution_budget",
    label: "Constitution & Budget",
    query: 'cardano (constitution OR "budget proposal" OR "treasury withdrawal" OR intersect OR "delegate representative") -airdrop -price -is:retweet',
  },
  {
    category: "protocol_parameter",
    label: "Protocol & Parameters",
    query: 'cardano ("parameter change" OR "hard fork" OR CIP OR "protocol upgrade" OR leios) -price -prediction -is:retweet',
  },
  {
    category: "network_ops",
    label: "Network Operations",
    query: 'cardano ("cardano-node" OR mithril OR "db-sync" OR "spo update" OR "node release" OR "node version") -is:retweet',
  },
  {
    category: "security",
    label: "Security & Incidents",
    query: "cardano (incident OR vulnerability OR exploit OR outage OR scam OR phishing) -is:retweet",
  },
  {
    category: "ecosystem_adoption",
    label: "Ecosystem & Adoption",
    query: "cardano (partnership OR adoption OR RWA OR launch OR integration) -airdrop -giveaway -prediction -is:retweet",
  },
  {
    category: "dev_tools",
    label: "Dev Tools & Releases",
    query: 'cardano (aiken OR plutus OR "mesh sdk" OR lucid OR blockfrost OR koios OR maestro OR demeter) (release OR update OR launch) -is:retweet',
  },
];

// ─── Noise Exclusion (post-filter) ──────────────────────────────────────────

const NOISE_PATTERNS = [
  /\b(airdrop|giveaway|1000x|buy now|to the moon|follow and retweet)\b/i,
  /\b(price prediction|moon shot|lambo)\b/i,
];

function isNoise(text) {
  return NOISE_PATTERNS.some((p) => p.test(text));
}

// ─── API Helpers ────────────────────────────────────────────────────────────

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const url = `https://api.twitterapi.io${endpoint}?${qs}`;

    const options = {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`API ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 200)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Tier 1: Collect account tweets ─────────────────────────────────────────

async function collectTier1() {
  console.log("\n=== Tier 1: Account Monitoring (via advanced_search) ===");
  const tweets = [];

  for (const account of TIER1_ACCOUNTS) {
    try {
      console.log(`  Fetching @${account.username} (${account.label})...`);
      // Use advanced_search with "from:username" — more reliable than last_tweets on free tier
      const res = await apiGet("/twitter/tweet/advanced_search", {
        query: `from:${account.username} -is:retweet`,
        queryType: "Latest",
      });

      // Debug: log response structure for first account
      if (account === TIER1_ACCOUNTS[0]) {
        console.log(`    [DEBUG] Response keys: ${Object.keys(res || {})}`);
        console.log(`    [DEBUG] Response preview: ${JSON.stringify(res).slice(0, 300)}`);
      }

      // Response format: { tweets: [...], has_next_page, next_cursor }
      let accountTweets = [];
      if (Array.isArray(res.tweets)) accountTweets = res.tweets;
      else if (Array.isArray(res.data?.tweets)) accountTweets = res.data.tweets;
      else if (Array.isArray(res.data)) accountTweets = res.data;
      else console.log(`    [WARN] Unexpected response format: ${JSON.stringify(res).slice(0, 200)}`);

      let count = 0;

      for (const t of accountTweets) {
        // Only include tweets from last 48h
        const createdAt = new Date(t.createdAt || t.created_at || 0);
        const hoursDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 48) continue;

        const text = t.text || t.full_text || "";

        tweets.push({
          id: t.id || t.tweetId || t.id_str,
          text: text,
          author: account.username,
          authorLabel: account.label,
          createdAt: t.createdAt || t.created_at,
          tier: 1,
          category: account.category,
          likes: t.likeCount || t.favorite_count || 0,
          retweets: t.retweetCount || t.retweet_count || 0,
          url: `https://x.com/${account.username}/status/${t.id || t.tweetId || t.id_str}`,
        });
        count++;
      }

      console.log(`    → ${count} tweets (last 48h)`);
      await sleep(5500); // Rate limit: free tier = 1 req per 5 seconds
    } catch (err) {
      console.error(`    ✗ Error fetching @${account.username}: ${err.message}`);
      await sleep(5500); // Also wait on error
    }
  }

  console.log(`  Tier 1 total: ${tweets.length} tweets`);
  return tweets;
}

// ─── Tier 2: Keyword searches ───────────────────────────────────────────────

async function collectTier2() {
  console.log("\n=== Tier 2: Keyword Searches ===");
  const tweets = [];

  for (const search of TIER2_SEARCHES) {
    try {
      console.log(`  Searching: ${search.label}...`);
      const res = await apiGet("/twitter/tweet/advanced_search", {
        query: search.query,
        queryType: "Latest",
      });

      // Debug: log response structure for first search
      if (search === TIER2_SEARCHES[0]) {
        console.log(`    [DEBUG] Search response keys: ${Object.keys(res || {})}`);
        console.log(`    [DEBUG] Search preview: ${JSON.stringify(res).slice(0, 300)}`);
      }

      // Response format: { status, data: { tweets: [...] }, has_next_page, next_cursor }
      let searchTweets = [];
      if (Array.isArray(res.data?.tweets)) searchTweets = res.data.tweets;
      else if (Array.isArray(res.tweets)) searchTweets = res.tweets;
      else if (Array.isArray(res.data)) searchTweets = res.data;
      else console.log(`    [WARN] Unexpected search response format: ${JSON.stringify(res).slice(0, 200)}`);

      let count = 0;

      for (const t of searchTweets) {
        const text = t.text || t.full_text || "";

        // Post-filter noise
        if (isNoise(text)) continue;

        // Only last 48h
        const createdAt = new Date(t.createdAt || t.created_at || 0);
        const hoursDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 48) continue;

        const authorName = t.author?.userName || t.user?.screen_name || "unknown";

        tweets.push({
          id: t.id || t.tweetId || t.id_str,
          text: text,
          author: authorName,
          authorLabel: t.author?.name || t.user?.name || authorName,
          createdAt: t.createdAt || t.created_at,
          tier: 2,
          category: search.category,
          searchLabel: search.label,
          likes: t.likeCount || t.favorite_count || 0,
          retweets: t.retweetCount || t.retweet_count || 0,
          url: `https://x.com/${authorName}/status/${t.id || t.tweetId || t.id_str}`,
        });
        count++;
      }

      console.log(`    → ${count} tweets`);
      await sleep(5500); // Rate limit: free tier = 1 req per 5 seconds
    } catch (err) {
      console.error(`    ✗ Error searching "${search.label}": ${err.message}`);
      await sleep(5500); // Also wait on error
    }
  }

  console.log(`  Tier 2 total: ${tweets.length} tweets`);
  return tweets;
}

// ─── Deduplication & Output ─────────────────────────────────────────────────

function deduplicateAndSort(tier1, tier2) {
  const seen = new Map();

  // Tier 1 has priority
  for (const t of tier1) {
    if (t.id) seen.set(t.id, t);
  }
  for (const t of tier2) {
    if (t.id && !seen.has(t.id)) {
      seen.set(t.id, t);
    }
  }

  // Sort by date descending
  const all = Array.from(seen.values());
  all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return all;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  X Data Collector for Cardano DRep Hub       ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Time: ${new Date().toISOString()}`);

  const tier1 = await collectTier1();
  const tier2 = await collectTier2();

  const all = deduplicateAndSort(tier1, tier2);

  console.log(`\n=== Results ===`);
  console.log(`  Tier 1: ${tier1.length} tweets`);
  console.log(`  Tier 2: ${tier2.length} tweets`);
  console.log(`  After dedup: ${all.length} unique tweets`);

  // Category breakdown
  const catCounts = {};
  for (const t of all) {
    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  }
  console.log(`  Categories:`, catCounts);

  // Load existing data for merging (keep 7 days of history)
  const outPath = path.join(DATA_DIR, "x-raw-tweets.json");
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  } catch (_) {}

  // Merge: keep existing tweets within 7 days, add new ones
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const merged = new Map();
  for (const t of existing) {
    const ts = new Date(t.createdAt || 0).getTime();
    if (ts > sevenDaysAgo && t.id) merged.set(t.id, t);
  }
  for (const t of all) {
    if (t.id) merged.set(t.id, t); // New data overwrites old
  }

  const output = Array.from(merged.values());
  output.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Write
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n  Saved ${output.length} tweets (7-day window) → ${outPath}`);

  // Write meta
  const metaPath = path.join(DATA_DIR, "x-digest-meta.json");
  const meta = {
    lastRun: new Date().toISOString(),
    tier1Accounts: TIER1_ACCOUNTS.length,
    tier2Searches: TIER2_SEARCHES.length,
    tier1Collected: tier1.length,
    tier2Collected: tier2.length,
    deduplicated: all.length,
    totalStored: output.length,
    categories: catCounts,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`  Meta → ${metaPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
