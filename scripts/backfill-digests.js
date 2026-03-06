#!/usr/bin/env node
/**
 * Backfill Digest Generator
 *
 * One-time script to collect and summarize historical tweets from 2026-01-01
 * to today. Uses TwitterAPI.io advanced_search with date range filters.
 *
 * Strategy:
 *   - For each date, query a subset of key accounts + keyword searches
 *   - Summarize each day's tweets via Claude Haiku
 *   - Save to monthly files (x-digest-YYYY-MM.json) + update index
 *
 * Usage:
 *   TWITTER_API_KEY=xxx CLAUDE_API_KEY=xxx node scripts/backfill-digests.js
 *   TWITTER_API_KEY=xxx CLAUDE_API_KEY=xxx node scripts/backfill-digests.js --from 2026-02-01 --to 2026-02-28
 *   TWITTER_API_KEY=xxx CLAUDE_API_KEY=xxx node scripts/backfill-digests.js --skip-collect  (summarize only from cached raw data)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!TWITTER_API_KEY) {
  console.error("ERROR: TWITTER_API_KEY required");
  process.exit(1);
}
if (!CLAUDE_API_KEY) {
  console.error("ERROR: CLAUDE_API_KEY required");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data");
const BACKFILL_DIR = path.join(DATA_DIR, "backfill");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKFILL_DIR)) fs.mkdirSync(BACKFILL_DIR, { recursive: true });

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}
const ARG_FROM = getArg("--from") || "2026-01-01";
const ARG_TO = getArg("--to") || new Date().toISOString().split("T")[0];
const SKIP_COLLECT = args.includes("--skip-collect");

// ─── Key accounts to query (subset for backfill — most important) ─────────

const BACKFILL_ACCOUNTS = [
  // Institutional
  "InputOutputHK", "Cardano", "Cardano_CF", "IntersectMBO", "emurgo_io", "Catalyst_onX",
  // Key Persons
  "IOHK_Charles", "SebastienGllmt", "adamKDean", "Cerkoryn", "Quantumplation",
  "cwpaulm", "rickymccallion", "AndrewWestwortn", "Padierfind",
  // Governance
  "CardanoGovBot", "DRepDirectory", "CardanoAiken",
  // SPO & Tools
  "CardanoStaking", "StakeWithPride", "ATADA_Stakepool",
  // Japan / Asia
  "taichiyokoyama", "btbfpark", "mitsuki_cardano",
  // Dev
  "blaboratory_", "FluidTokens", "MinswapDEX", "SundaeSwap", "GeniusyieldO",
];

const BACKFILL_SEARCHES = [
  { category: "governance_action", query: 'cardano (governance OR "governance action" OR DRep OR "constitutional committee" OR CIP) -is:retweet' },
  { category: "ecosystem_adoption", query: "cardano (partnership OR adoption OR launch OR integration) -airdrop -giveaway -is:retweet" },
  { category: "dev_tools", query: "cardano (aiken OR plutus OR release OR update) (tool OR sdk OR library) -is:retweet" },
  { category: "protocol_parameter", query: "cardano (hard fork OR parameter OR protocol OR upgrade OR Leios OR Ouroboros) -is:retweet" },
];

// ─── API helpers ─────────────────────────────────────────────────────────────

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const url = `https://api.twitterapi.io${endpoint}?${qs}`;

    const req = https.request(url, {
      method: "GET",
      headers: { "X-API-Key": TWITTER_API_KEY, Accept: "application/json" },
    }, (res) => {
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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Request timeout")); });
    req.end();
  });
}

function callClaude(systemPrompt, userMessage, maxTokens = 3000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Claude API ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 300)}`));
            return;
          }
          const text = parsed.content?.[0]?.text || "";
          const usage = parsed.usage || {};
          resolve({ text, usage });
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("Claude API timeout")); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function dateRange(fromStr, toStr) {
  const dates = [];
  const d = new Date(fromStr + "T00:00:00Z");
  const end = new Date(toStr + "T00:00:00Z");
  while (d <= end) {
    dates.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── Collect tweets for a specific date ──────────────────────────────────────

async function collectForDate(dateStr) {
  const cacheFile = path.join(BACKFILL_DIR, `raw-${dateStr}.json`);

  // Check cache
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    console.log(`  [Cache hit] ${dateStr}: ${cached.length} tweets`);
    return cached;
  }

  const untilDate = nextDay(dateStr);
  const tweets = [];
  const seen = new Set();

  // Query key accounts (batch them — 5 accounts per query using OR)
  const batches = [];
  for (let i = 0; i < BACKFILL_ACCOUNTS.length; i += 5) {
    const batch = BACKFILL_ACCOUNTS.slice(i, i + 5);
    const fromQuery = batch.map((u) => `from:${u}`).join(" OR ");
    batches.push({ query: `(${fromQuery}) -is:retweet since:${dateStr} until:${untilDate}`, category: "mixed" });
  }

  // Add keyword searches with date filter
  for (const s of BACKFILL_SEARCHES) {
    batches.push({ query: `${s.query} since:${dateStr} until:${untilDate}`, category: s.category });
  }

  for (const batch of batches) {
    try {
      const res = await apiGet("/twitter/tweet/advanced_search", {
        query: batch.query,
        queryType: "Latest",
      });

      let tweetArr = [];
      if (Array.isArray(res.tweets)) tweetArr = res.tweets;
      else if (Array.isArray(res.data?.tweets)) tweetArr = res.data.tweets;
      else if (Array.isArray(res.data)) tweetArr = res.data;

      for (const t of tweetArr) {
        const id = t.id || t.tweetId || t.id_str;
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const authorName = t.author?.userName || t.user?.screen_name || "unknown";
        tweets.push({
          id,
          text: t.text || t.full_text || "",
          author: authorName,
          createdAt: t.createdAt || t.created_at,
          category: batch.category === "mixed" ? guessCategoryFromAuthor(authorName) : batch.category,
          likes: t.likeCount || t.favorite_count || 0,
          retweets: t.retweetCount || t.retweet_count || 0,
        });
      }

      await sleep(200); // Rate limiting for paid tier
    } catch (err) {
      console.error(`    [WARN] Query failed: ${err.message}`);
      await sleep(500);
    }
  }

  // Cache raw tweets for this date
  fs.writeFileSync(cacheFile, JSON.stringify(tweets, null, 2));
  console.log(`  [Collected] ${dateStr}: ${tweets.length} tweets (${batches.length} queries)`);
  return tweets;
}

function guessCategoryFromAuthor(username) {
  const lower = username.toLowerCase();
  const catMap = {
    inputoutputhk: "institutional", cardano: "institutional", cardano_cf: "institutional",
    intersectmbo: "institutional", emurgo_io: "institutional", catalyst_onx: "institutional",
    iohk_charles: "key_person", sebastienGllmt: "key_person", adamkdean: "key_person",
    cerkoryn: "key_person", quantumplation: "key_person", cwpaulm: "key_person",
    rickymccallion: "key_person", padierfind: "key_person", andrewwestwortn: "key_person",
    taichiyokoyama: "key_person", btbfpark: "key_person", mitsuki_cardano: "key_person",
    cardanogovbot: "governance_tool", drepdirectory: "governance_tool",
    cardanoaiken: "dev_tools", blaboratory_: "dev_tools",
    fluidtokens: "ecosystem_adoption", minswap: "ecosystem_adoption",
    sundaeswap: "ecosystem_adoption", geniusyieldo: "ecosystem_adoption",
    cardanostaking: "spo", stakewithpride: "spo", atada_stakepool: "spo",
  };
  return catMap[lower] || "key_person";
}

// ─── Summarize tweets for a specific date ────────────────────────────────────

const CATEGORIES = {
  institutional: "Official Announcements",
  governance_action: "Governance Actions",
  constitution_budget: "Constitution & Budget",
  protocol_parameter: "Protocol & Parameters",
  network_ops: "Network Operations",
  security: "Security & Incidents",
  ecosystem_adoption: "Ecosystem & Adoption",
  dev_tools: "Dev Tools & Releases",
  key_person: "Key Persons",
  governance_tool: "Governance Tools",
  spo: "SPO Related",
};

async function summarizeForDate(dateStr, tweets) {
  if (tweets.length === 0) {
    console.log(`  [Skip] ${dateStr}: no tweets to summarize`);
    return null;
  }

  // Sort by engagement
  tweets.sort((a, b) => ((b.likes || 0) + (b.retweets || 0)) - ((a.likes || 0) + (a.retweets || 0)));

  // Group by category
  const grouped = {};
  for (const t of tweets) {
    const cat = t.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  // Build tweet text (limit to avoid token overflow)
  let tweetText = "";
  for (const [cat, catTweets] of Object.entries(grouped)) {
    const label = CATEGORIES[cat] || cat;
    tweetText += `\n## ${label}\n`;
    for (const t of catTweets.slice(0, 10)) {
      tweetText += `- @${t.author}: ${t.text.slice(0, 280)} [${t.likes || 0}♥ ${t.retweets || 0}RT]\n`;
    }
  }

  // Limit total size to ~6000 chars to keep input tokens manageable
  if (tweetText.length > 6000) {
    tweetText = tweetText.slice(0, 6000) + "\n... (truncated)";
  }

  const systemPrompt = `You are a Cardano governance analyst creating a daily digest for DReps, CC members, SPOs, and ADA holders.
The date is ${dateStr}. Output ONLY valid JSON (no markdown, no explanation).
{
  "date": "${dateStr}",
  "highlights": [
    {
      "category": "category_key",
      "title_en": "Brief English title",
      "title_ja": "日本語タイトル",
      "summary_en": "1-2 sentence English summary",
      "summary_ja": "日本語要約（1-2文）",
      "importance": 1-5,
      "audience": ["DRep", "CC", "SPO", "Holder", "Builder"],
      "sources": ["@username"]
    }
  ]
}
Select the TOP 5-10 most important items. Rate importance 1-5 (5=critical).
Category keys: governance_action, constitution_budget, protocol_parameter, network_ops, security, ecosystem_adoption, dev_tools, institutional, key_person, governance_tool, spo`;

  const userMsg = `Analyze these Cardano-related tweets from ${dateStr} and create a daily digest:\n${tweetText}`;

  try {
    const { text, usage } = await callClaude(systemPrompt, userMsg, 3000);
    console.log(`  [Summarized] ${dateStr}: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const digest = JSON.parse(jsonStr);
    digest.date = dateStr; // Force correct date
    digest.tweetCount = tweets.length;
    digest.generatedAt = new Date().toISOString();
    digest.backfilled = true;
    return digest;
  } catch (err) {
    console.error(`  [ERROR] Summarize ${dateStr}: ${err.message}`);
    return null;
  }
}

// ─── Monthly file & index helpers (same as summarize-x-digest.js) ────────────

function monthlyFilePath(monthStr) {
  return path.join(DATA_DIR, `x-digest-${monthStr}.json`);
}

function loadMonthlyDigests(monthStr) {
  try {
    return JSON.parse(fs.readFileSync(monthlyFilePath(monthStr), "utf-8"));
  } catch (_) {
    return [];
  }
}

function saveMonthlyDigests(monthStr, digests) {
  fs.writeFileSync(monthlyFilePath(monthStr), JSON.stringify(digests, null, 2));
}

function loadDigestIndex() {
  const indexPath = path.join(DATA_DIR, "x-digest-index.json");
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch (_) {
    return { months: [], days: {}, lastUpdated: null };
  }
}

function saveDigestIndex(index) {
  const indexPath = path.join(DATA_DIR, "x-digest-index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

function saveDailyDigest(daily) {
  const dateStr = daily.date;
  const month = dateStr.slice(0, 7);

  // 1. Save to monthly file
  const monthDigests = loadMonthlyDigests(month);
  const filtered = monthDigests.filter((d) => d.date !== dateStr);
  filtered.push(daily);
  filtered.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  saveMonthlyDigests(month, filtered);

  // 2. Update index
  const index = loadDigestIndex();
  if (!index.months.includes(month)) {
    index.months.push(month);
    index.months.sort().reverse();
  }
  if (!index.days[month]) index.days[month] = [];
  if (!index.days[month].includes(dateStr)) {
    index.days[month].push(dateStr);
    index.days[month].sort();
  }
  index.lastUpdated = new Date().toISOString();
  saveDigestIndex(index);
}

// ─── Update backward-compat x-daily-digest.json ─────────────────────────────

function updateDailyDigestCompat() {
  // Collect all digests, pick latest 7
  const index = loadDigestIndex();
  const allDigests = [];
  for (const month of index.months) {
    const digests = loadMonthlyDigests(month);
    allDigests.push(...digests);
  }
  allDigests.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latest7 = allDigests.slice(0, 7);
  const dailyPath = path.join(DATA_DIR, "x-daily-digest.json");
  fs.writeFileSync(dailyPath, JSON.stringify(latest7, null, 2));
  console.log(`\nUpdated x-daily-digest.json with latest ${latest7.length} days`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Backfill Digest Generator                       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Range: ${ARG_FROM} → ${ARG_TO}`);
  console.log(`  Skip collect: ${SKIP_COLLECT}`);

  const dates = dateRange(ARG_FROM, ARG_TO);
  console.log(`  Total dates: ${dates.length}\n`);

  // Check which dates already have digests
  const index = loadDigestIndex();
  const existingDates = new Set();
  for (const days of Object.values(index.days || {})) {
    for (const d of days) existingDates.add(d);
  }

  let collected = 0;
  let summarized = 0;
  let skipped = 0;
  let errors = 0;

  for (const dateStr of dates) {
    // Skip dates that already have digests
    if (existingDates.has(dateStr)) {
      console.log(`  [Exists] ${dateStr} — already has digest, skipping`);
      skipped++;
      continue;
    }

    console.log(`\n── ${dateStr} ──`);

    try {
      // Step 1: Collect tweets
      let tweets;
      if (SKIP_COLLECT) {
        const cacheFile = path.join(BACKFILL_DIR, `raw-${dateStr}.json`);
        if (fs.existsSync(cacheFile)) {
          tweets = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
          console.log(`  [Cache] ${tweets.length} tweets`);
        } else {
          console.log(`  [Skip] No cached data for ${dateStr}`);
          skipped++;
          continue;
        }
      } else {
        tweets = await collectForDate(dateStr);
        collected++;
      }

      // Step 2: Summarize
      if (tweets.length > 0) {
        const digest = await summarizeForDate(dateStr, tweets);
        if (digest) {
          saveDailyDigest(digest);
          summarized++;
          console.log(`  [Saved] ${dateStr}: ${digest.highlights?.length || 0} highlights`);
        } else {
          errors++;
        }
      } else {
        console.log(`  [Empty] ${dateStr}: no tweets found`);
      }

      // Small delay between dates to avoid rate limits
      await sleep(500);

    } catch (err) {
      console.error(`  [FATAL] ${dateStr}: ${err.message}`);
      errors++;
      await sleep(2000);
    }
  }

  // Update backward-compat file
  updateDailyDigestCompat();

  // Summary
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Backfill Complete                                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Dates processed: ${dates.length}`);
  console.log(`  Collected: ${collected}`);
  console.log(`  Summarized: ${summarized}`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  // Show final index state
  const finalIndex = loadDigestIndex();
  console.log(`  Months in index: ${finalIndex.months.join(", ")}`);
  for (const [month, days] of Object.entries(finalIndex.days)) {
    console.log(`    ${month}: ${days.length} days`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
