#!/usr/bin/env node
/**
 * X Digest Summarizer using Claude Haiku
 *
 * Reads raw tweets from data/x-raw-tweets.json, categorizes and summarizes
 * using Claude Haiku, outputs structured digest files.
 *
 * Output:
 *   data/x-daily-digest.json   — today's digest (highlights per category)
 *   data/x-weekly-digest.json  — weekly summary (updated on Sundays or when 7+ days accumulated)
 *   data/x-digest-meta.json    — updated with summarization stats
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

// Audience tags per category
const AUDIENCE_TAGS = {
  governance_action: ["DRep", "CC"],
  constitution_budget: ["DRep", "CC"],
  protocol_parameter: ["DRep", "CC", "SPO"],
  network_ops: ["SPO"],
  security: ["DRep", "CC", "SPO", "Holder", "Builder"],
  ecosystem_adoption: ["Holder", "DRep"],
  dev_tools: ["Builder"],
  institutional: ["DRep", "CC", "SPO", "Holder"],
  key_person: ["DRep", "CC", "SPO", "Holder"],
  governance_tool: ["DRep", "CC"],
  spo: ["SPO"],
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

// ─── Build daily digest ─────────────────────────────────────────────────────

async function buildDailyDigest(tweets) {
  console.log("\n=== Building Daily Digest ===");

  // Filter to last 24h tweets
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = tweets.filter((t) => new Date(t.createdAt || 0).getTime() > oneDayAgo);

  if (recent.length === 0) {
    console.log("  No tweets in last 24h, using last 48h...");
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    recent.push(...tweets.filter((t) => new Date(t.createdAt || 0).getTime() > twoDaysAgo));
  }

  console.log(`  Tweets to summarize: ${recent.length}`);

  if (recent.length === 0) {
    console.log("  No tweets to summarize");
    return null;
  }

  // Group by category
  const grouped = {};
  for (const t of recent) {
    const cat = t.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  // Build tweet text for Claude
  let tweetText = "";
  for (const [cat, catTweets] of Object.entries(grouped)) {
    const label = CATEGORIES[cat]?.en || cat;
    tweetText += `\n## ${label}\n`;
    for (const t of catTweets.slice(0, 20)) {
      // Limit per category
      tweetText += `- @${t.author}: ${t.text.slice(0, 280)} [${t.likes || 0} likes]\n`;
    }
  }

  const systemPrompt = `You are a Cardano governance analyst creating a daily digest for DReps, CC members, SPOs, and ADA holders.
Output ONLY valid JSON (no markdown, no explanation). The JSON should have this structure:
{
  "date": "YYYY-MM-DD",
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
Select the TOP 5-10 most important items across all categories. Rate importance 1-5 (5=critical).
Category keys: governance_action, constitution_budget, protocol_parameter, network_ops, security, ecosystem_adoption, dev_tools, institutional, key_person, governance_tool, spo`;

  const userMsg = `Analyze these Cardano-related tweets from the last 24 hours and create a daily digest:\n${tweetText}`;

  try {
    const { text, usage } = await callClaude(systemPrompt, userMsg, 3000);
    console.log(`  Claude usage: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const digest = JSON.parse(jsonStr);
    digest.date = digest.date || new Date().toISOString().split("T")[0];
    digest.tweetCount = recent.length;
    digest.generatedAt = new Date().toISOString();
    digest.apiUsage = usage;

    return digest;
  } catch (err) {
    console.error(`  ✗ Claude error: ${err.message}`);
    return null;
  }
}

// ─── Build weekly digest ────────────────────────────────────────────────────

async function buildWeeklyDigest(dailyDigests) {
  console.log("\n=== Building Weekly Digest ===");

  if (!dailyDigests || dailyDigests.length === 0) {
    console.log("  No daily digests available");
    return null;
  }

  // Combine all highlights from daily digests
  let allHighlights = "";
  for (const d of dailyDigests) {
    allHighlights += `\n### ${d.date}\n`;
    for (const h of d.highlights || []) {
      allHighlights += `- [${h.category}] ${h.title_en}: ${h.summary_en} (importance: ${h.importance})\n`;
    }
  }

  const systemPrompt = `You are a Cardano governance analyst creating a weekly summary.
Output ONLY valid JSON:
{
  "weekStart": "YYYY-MM-DD",
  "weekEnd": "YYYY-MM-DD",
  "summary_en": "3-5 sentence overall English summary of the week",
  "summary_ja": "週間全体の日本語要約（3-5文）",
  "topTopics": [
    {
      "topic_en": "Topic name",
      "topic_ja": "トピック名",
      "summary_en": "Brief summary",
      "summary_ja": "要約",
      "trend": "rising|stable|declining",
      "audience": ["DRep", "CC", "SPO"]
    }
  ],
  "actionItems": [
    {
      "action_en": "What stakeholders should pay attention to",
      "action_ja": "注目すべきポイント",
      "audience": ["DRep"]
    }
  ]
}`;

  const userMsg = `Summarize this week's Cardano governance activity into a weekly digest:\n${allHighlights}`;

  try {
    const { text, usage } = await callClaude(systemPrompt, userMsg, 3000);
    console.log(`  Claude usage: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const weekly = JSON.parse(jsonStr);
    weekly.generatedAt = new Date().toISOString();
    weekly.dailyDigestCount = dailyDigests.length;
    weekly.apiUsage = usage;

    return weekly;
  } catch (err) {
    console.error(`  ✗ Claude error: ${err.message}`);
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  X Digest Summarizer (Claude Haiku)          ║");
  console.log("╚══════════════════════════════════════════════╝");

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
    const dailyPath = path.join(DATA_DIR, "x-daily-digest.json");

    // Merge with existing daily digests (keep 7 days)
    let existingDaily = [];
    try {
      const existing = JSON.parse(fs.readFileSync(dailyPath, "utf-8"));
      existingDaily = Array.isArray(existing) ? existing : [existing];
    } catch (_) {}

    // Remove entries older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    existingDaily = existingDaily.filter(
      (d) => new Date(d.generatedAt || d.date || 0).getTime() > sevenDaysAgo
    );

    // Remove today's entry if exists, add new one
    const today = new Date().toISOString().split("T")[0];
    existingDaily = existingDaily.filter((d) => d.date !== today);
    existingDaily.push(daily);
    existingDaily.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    fs.writeFileSync(dailyPath, JSON.stringify(existingDaily, null, 2));
    console.log(`  Daily digest saved → ${dailyPath}`);

    // Build weekly digest on Sundays or if 7+ daily digests
    const dayOfWeek = new Date().getDay(); // 0=Sunday
    if (dayOfWeek === 0 || existingDaily.length >= 7) {
      const weekly = await buildWeeklyDigest(existingDaily);
      if (weekly) {
        const weeklyPath = path.join(DATA_DIR, "x-weekly-digest.json");

        // Keep history of weekly digests (last 4 weeks)
        let existingWeekly = [];
        try {
          const existing = JSON.parse(fs.readFileSync(weeklyPath, "utf-8"));
          existingWeekly = Array.isArray(existing) ? existing : [existing];
        } catch (_) {}
        existingWeekly.push(weekly);
        if (existingWeekly.length > 4) existingWeekly = existingWeekly.slice(-4);

        fs.writeFileSync(weeklyPath, JSON.stringify(existingWeekly, null, 2));
        console.log(`  Weekly digest saved → ${weeklyPath}`);
      }
    } else {
      console.log(`  Weekly digest: skipped (day=${dayOfWeek}, dailyCount=${existingDaily.length})`);
    }
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
