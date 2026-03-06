#!/usr/bin/env node
/**
 * X Digest Summarizer using Claude Haiku
 *
 * Reads raw tweets from data/x-raw-tweets.json, categorizes and summarizes
 * using Claude Haiku, outputs structured digest files.
 *
 * Output:
 *   data/x-digest-YYYY-MM.json — monthly partitioned daily digests (permanent)
 *   data/x-daily-digest.json   — latest 7 days (backward compat)
 *   data/x-digest-index.json   — available months/dates index
 *   data/x-digest-meta.json    — updated with summarization stats
 *
 * All date boundaries use UTC (UTC 0:00 – 23:59:59).
 *
 * Usage: CLAUDE_API_KEY=xxx node scripts/summarize-x-digest.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) {
  console.error("ERROR: CLAUDE_API_KEY environment variable is required");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data");

// ─── UTC date helpers ────────────────────────────────────────────────────────

/** Get today's date string in UTC: "YYYY-MM-DD" */
function utcToday() {
  return new Date().toISOString().split("T")[0];
}

/** Get UTC month string: "YYYY-MM" */
function utcMonth(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

/** Get UTC day start (00:00:00.000Z) for a date string */
function utcDayStart(dateStr) {
  return new Date(dateStr + "T00:00:00.000Z").getTime();
}

/** Get UTC day end (23:59:59.999Z) for a date string */
function utcDayEnd(dateStr) {
  return new Date(dateStr + "T23:59:59.999Z").getTime();
}

/** Get yesterday's date in UTC */
function utcYesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

/** Remove lone surrogates and other invalid Unicode from text */
function sanitizeText(str) {
  if (!str) return "";
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
            .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

// ─── Category definitions ───────────────────────────────────────────────────

const CATEGORIES = {
  institutional: { ja: "公式アナウンス", en: "Official Announcements" },
  governance_action: { ja: "ガバナンスアクション", en: "Governance Actions" },
  constitution_budget: { ja: "憲法・予算", en: "Constitution & Budget" },
  protocol_parameter: { ja: "プロトコル・パラメータ", en: "Protocol & Parameters" },
  network_ops: { ja: "ネットワーク運用", en: "Network Operations" },
  security: { ja: "セキュリティ", en: "Security & Incidents" },
  ecosystem_adoption: { ja: "エコシステム・採用", en: "Ecosystem & Adoption" },
  dev_tools: { ja: "開発ツール", en: "Dev Tools & Releases" },
  key_person: { ja: "キーパーソン", en: "Key Persons" },
  governance_tool: { ja: "ガバナンスツール", en: "Governance Tools" },
  spo: { ja: "SPO関連", en: "SPO Related" },
};

// ─── Claude API Helper ──────────────────────────────────────────────────────

function callClaude(systemPrompt, userMessage, maxTokens = 2048) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const req = https.request(options, (res) => {
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
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error("Claude API timeout"));
    });
    req.write(body);
    req.end();
  });
}

// ─── Monthly file I/O helpers ───────────────────────────────────────────────

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

// ─── Digest index management ────────────────────────────────────────────────

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

function updateDigestIndex(dateStr) {
  const index = loadDigestIndex();
  const month = utcMonth(dateStr);

  // Add month if new
  if (!index.months.includes(month)) {
    index.months.push(month);
    index.months.sort().reverse(); // newest first
  }

  // Add date to month's day list
  if (!index.days[month]) index.days[month] = [];
  if (!index.days[month].includes(dateStr)) {
    index.days[month].push(dateStr);
    index.days[month].sort(); // chronological
  }

  index.lastUpdated = new Date().toISOString();
  saveDigestIndex(index);
  console.log(`  Index updated: ${index.months.length} months, ${dateStr} added`);
}

// ─── Load previous highlights for dedup ─────────────────────────────────────

function loadPreviousHighlights() {
  // Try loading from current month's file first, then daily digest
  const month = utcMonth();
  const monthDigests = loadMonthlyDigests(month);
  const titles = [];
  // Get last 3 digests
  const recent = monthDigests.slice(-3);
  for (const d of recent) {
    for (const h of d.highlights || []) {
      if (h.title_en) titles.push(h.title_en);
    }
  }
  // Fallback to x-daily-digest.json if no monthly data yet
  if (titles.length === 0) {
    try {
      const dailyPath = path.join(DATA_DIR, "x-daily-digest.json");
      const existing = JSON.parse(fs.readFileSync(dailyPath, "utf-8"));
      const digests = Array.isArray(existing) ? existing : [existing];
      for (const d of digests.slice(0, 3)) {
        for (const h of d.highlights || []) {
          if (h.title_en) titles.push(h.title_en);
        }
      }
    } catch (_) {}
  }
  return titles;
}

// ─── Load last summarized tweet IDs ─────────────────────────────────────────

function loadSummarizedIds() {
  const idPath = path.join(DATA_DIR, "x-summarized-ids.json");
  try {
    return new Set(JSON.parse(fs.readFileSync(idPath, "utf-8")));
  } catch (_) {
    return new Set();
  }
}

function saveSummarizedIds(ids) {
  const idPath = path.join(DATA_DIR, "x-summarized-ids.json");
  // Keep only last 2000 IDs to prevent unbounded growth
  const arr = [...ids].slice(-2000);
  fs.writeFileSync(idPath, JSON.stringify(arr));
}

// ─── Build daily digest ─────────────────────────────────────────────────────

async function buildDailyDigest(tweets) {
  console.log("\n=== Building Daily Digest ===");

  const today = utcToday();
  const yesterday = utcYesterday();
  console.log(`  Target date (UTC): ${today}`);

  // Load already-summarized tweet IDs
  const summarizedIds = loadSummarizedIds();
  console.log(`  Previously summarized IDs: ${summarizedIds.size}`);

  // Filter tweets to today's UTC window (00:00 – 23:59 UTC)
  const todayStart = utcDayStart(today);
  const todayEnd = utcDayEnd(today);
  let recent = tweets.filter((t) => {
    const ts = new Date(t.createdAt || 0).getTime();
    return ts >= todayStart && ts <= todayEnd;
  });

  // Fallback: if no tweets today, include yesterday's UTC window too
  if (recent.length === 0) {
    console.log("  No tweets in today's UTC window, including yesterday...");
    const yesterdayStart = utcDayStart(yesterday);
    recent = tweets.filter((t) => {
      const ts = new Date(t.createdAt || 0).getTime();
      return ts >= yesterdayStart && ts <= todayEnd;
    });
  }

  console.log(`  Tweets in UTC window: ${recent.length}`);

  // Remove already-summarized tweets
  const newTweets = recent.filter((t) => !summarizedIds.has(t.id));
  console.log(`  New (unsummarized) tweets: ${newTweets.length}`);

  if (newTweets.length === 0) {
    console.log("  No new tweets to summarize — skipping");
    return null;
  }

  // Sort by engagement (likes + retweets) to prioritize impactful tweets
  newTweets.sort((a, b) => ((b.likes || 0) + (b.retweets || 0)) - ((a.likes || 0) + (a.retweets || 0)));

  // Group by category
  const grouped = {};
  for (const t of newTweets) {
    const cat = t.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  // Build tweet text for Claude
  let tweetText = "";
  for (const [cat, catTweets] of Object.entries(grouped)) {
    const label = CATEGORIES[cat]?.en || cat;
    tweetText += `\n## ${label}\n`;
    for (const t of catTweets.slice(0, 15)) {
      tweetText += `- @${t.author}: ${sanitizeText(t.text).slice(0, 280)} [${t.likes || 0}♥ ${t.retweets || 0}RT]\n`;
    }
  }

  // Load previous highlights for dedup instruction
  const prevTitles = loadPreviousHighlights();
  let dedupInstruction = "";
  if (prevTitles.length > 0) {
    dedupInstruction = `\n\nIMPORTANT — AVOID REPEATING these topics from previous digests (find NEW angles or skip if no new development):\n${prevTitles.map((t) => `- "${t}"`).join("\n")}`;
  }

  const systemPrompt = `You are a Cardano governance analyst creating a daily digest for DReps, CC members, SPOs, and ADA holders.
Output ONLY valid JSON (no markdown, no explanation). The JSON should have this structure:
{
  "date": "${today}",
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
Select the TOP 5-10 most important NEW items across all categories. Rate importance 1-5 (5=critical).
Focus on what is NEW or CHANGED today. Do NOT repeat topics that were already covered in previous digests unless there is a significant new development.
Category keys: governance_action, constitution_budget, protocol_parameter, network_ops, security, ecosystem_adoption, dev_tools, institutional, key_person, governance_tool, spo${dedupInstruction}`;

  const userMsg = `Analyze these NEW Cardano-related tweets (not previously summarized) and create today's daily digest:\n${tweetText}`;

  try {
    const { text, usage } = await callClaude(systemPrompt, userMsg, 3000);
    console.log(`  Claude usage: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const digest = JSON.parse(jsonStr);
    digest.date = today; // Always use UTC today
    digest.tweetCount = newTweets.length;
    digest.generatedAt = new Date().toISOString();
    digest.apiUsage = usage;

    // Mark these tweets as summarized
    for (const t of newTweets) {
      if (t.id) summarizedIds.add(t.id);
    }
    saveSummarizedIds(summarizedIds);
    console.log(`  Marked ${newTweets.length} tweets as summarized (total tracked: ${summarizedIds.size})`);

    return digest;
  } catch (err) {
    console.error(`  ✗ Claude error: ${err.message}`);
    return null;
  }
}

// ─── Save daily digest to monthly file + backward-compat + index ────────────

function saveDailyDigest(daily) {
  const dateStr = daily.date;
  const month = utcMonth(dateStr);

  // ── 1. Save to monthly file (permanent accumulation) ──
  const monthDigests = loadMonthlyDigests(month);
  // Remove same-date entry if exists (re-run safety)
  const filtered = monthDigests.filter((d) => d.date !== dateStr);
  filtered.push(daily);
  filtered.sort((a, b) => (a.date || "").localeCompare(b.date || "")); // chronological
  saveMonthlyDigests(month, filtered);
  console.log(`  Monthly file saved → x-digest-${month}.json (${filtered.length} days)`);

  // ── 2. Update backward-compat x-daily-digest.json (latest 7 days) ──
  const dailyPath = path.join(DATA_DIR, "x-daily-digest.json");
  let recent7 = [];
  try {
    recent7 = JSON.parse(fs.readFileSync(dailyPath, "utf-8"));
    if (!Array.isArray(recent7)) recent7 = [recent7];
  } catch (_) {}
  recent7 = recent7.filter((d) => d.date !== dateStr);
  recent7.push(daily);
  recent7.sort((a, b) => (b.date || "").localeCompare(a.date || "")); // newest first
  if (recent7.length > 7) recent7 = recent7.slice(0, 7);
  fs.writeFileSync(dailyPath, JSON.stringify(recent7, null, 2));
  console.log(`  Backward-compat saved → x-daily-digest.json (${recent7.length} days)`);

  // ── 3. Update digest index ──
  updateDigestIndex(dateStr);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  X Digest Summarizer (Claude Haiku)          ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  UTC now: ${new Date().toISOString()}`);
  console.log(`  UTC date: ${utcToday()}`);

  // Load raw tweets
  const rawPath = path.join(DATA_DIR, "x-raw-tweets.json");
  if (!fs.existsSync(rawPath)) {
    console.error("No raw tweets found. Run collect-x-digest.js first.");
    process.exit(1);
  }

  const tweets = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  console.log(`  Loaded ${tweets.length} raw tweets`);

  // Build daily digest
  const daily = await buildDailyDigest(tweets);
  if (daily) {
    saveDailyDigest(daily);
  } else {
    console.log("  No daily digest generated (no new tweets)");
  }

  // Update meta
  const metaPath = path.join(DATA_DIR, "x-digest-meta.json");
  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch (_) {}

  meta.lastSummarized = new Date().toISOString();
  meta.dailySummarized = daily ? true : false;
  meta.dailyApiUsage = daily?.apiUsage || null;

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`\n  Meta updated → ${metaPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
