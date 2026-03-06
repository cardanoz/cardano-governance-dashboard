#!/usr/bin/env node
/**
 * Monthly Digest Generator
 *
 * Generates a monthly summary from accumulated daily digests.
 * Intended to run on the last Friday of each month (UTC).
 *
 * Usage:
 *   CLAUDE_API_KEY=xxx node scripts/generate-monthly-digest.js
 *   CLAUDE_API_KEY=xxx node scripts/generate-monthly-digest.js --force          # skip day check
 *   CLAUDE_API_KEY=xxx node scripts/generate-monthly-digest.js --month 2026-02  # specific month
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
const args = process.argv.slice(2);
const forceRun = args.includes("--force");
const monthArgIdx = args.indexOf("--month");
const targetMonth = monthArgIdx >= 0 ? args[monthArgIdx + 1] : null;

// ─── UTC helpers ─────────────────────────────────────────────────────────────

function isLastFridayOfMonth() {
  const now = new Date();
  if (now.getUTCDay() !== 5) return false; // Not Friday
  const nextWeek = new Date(now);
  nextWeek.setUTCDate(now.getUTCDate() + 7);
  return nextWeek.getUTCMonth() !== now.getUTCMonth();
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ─── Claude API ──────────────────────────────────────────────────────────────

function callClaude(systemPrompt, userMessage, maxTokens = 4000) {
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
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error("Claude API timeout"));
    });
    req.write(body);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Monthly Digest Generator (Claude Haiku)      ║");
  console.log("╚══════════════════════════════════════════════╝");

  // Check if it's the last Friday of the month
  if (!forceRun && !targetMonth && !isLastFridayOfMonth()) {
    console.log("  Not the last Friday of the month — skipping.");
    console.log("  Use --force to run anyway, or --month YYYY-MM for a specific month.");
    process.exit(0);
  }

  const month = targetMonth || getCurrentMonth();
  console.log(`  Target month: ${month}`);

  // Load month's daily digests
  const monthFile = path.join(DATA_DIR, `x-digest-${month}.json`);
  let dailyDigests = [];
  try {
    dailyDigests = JSON.parse(fs.readFileSync(monthFile, "utf-8"));
  } catch (_) {
    // Fallback: try x-daily-digest.json
    try {
      const all = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "x-daily-digest.json"), "utf-8"));
      dailyDigests = (Array.isArray(all) ? all : [all]).filter(d => d.date && d.date.startsWith(month));
    } catch (_2) {}
  }

  if (dailyDigests.length === 0) {
    console.log(`  No daily digests found for ${month}`);
    process.exit(0);
  }

  console.log(`  Found ${dailyDigests.length} daily digests for ${month}`);

  // Aggregate all highlights — only keep importance >= 3 to reduce input size
  let allHighlightsText = "";
  let totalTweets = 0;
  let totalHighlights = 0;
  let includedHighlights = 0;

  for (const d of dailyDigests) {
    totalTweets += d.tweetCount || 0;
    const important = (d.highlights || []).filter(h => (h.importance || 0) >= 3);
    if (important.length === 0) continue;
    allHighlightsText += `\n### ${d.date}\n`;
    for (const h of important) {
      totalHighlights++;
      includedHighlights++;
      // Use title only (skip summary) to save tokens
      allHighlightsText += `- [${h.category}][imp:${h.importance}] ${h.title_en}\n`;
    }
  }
  // Also count low-importance ones for stats
  for (const d of dailyDigests) {
    for (const h of d.highlights || []) {
      if ((h.importance || 0) < 3) totalHighlights++;
    }
  }

  console.log(`  Total: ${totalHighlights} highlights (${includedHighlights} important) from ${totalTweets} tweets`);

  // Truncate if still too large (~8000 chars ≈ 2000 tokens)
  if (allHighlightsText.length > 8000) {
    allHighlightsText = allHighlightsText.slice(0, 8000) + "\n... (truncated)";
  }

  // Generate monthly summary via Claude Haiku
  const systemPrompt = `You are a Cardano governance analyst creating a MONTHLY summary digest.
Analyze all daily highlights from ${month} and produce a comprehensive monthly overview.
Output ONLY valid JSON (no markdown, no explanation):
{
  "month": "${month}",
  "summary_en": "3-5 sentence English overview of the month's governance activity",
  "summary_ja": "月間全体の日本語要約（3-5文）",
  "topHighlights": [
    {
      "category": "category_key",
      "title_en": "Most significant topic title",
      "title_ja": "日本語タイトル",
      "summary_en": "Why this was significant this month",
      "summary_ja": "日本語要約",
      "importance": 5
    }
  ],
  "trends": [
    {
      "category": "category_key",
      "trend": "rising|stable|declining",
      "note_en": "Brief trend description",
      "note_ja": "トレンド説明"
    }
  ],
  "actionItems": [
    {
      "action_en": "What stakeholders should watch next month",
      "action_ja": "来月の注目ポイント",
      "audience": ["DRep", "CC", "SPO"]
    }
  ]
}
Select TOP 5 most impactful highlights. Identify 3 category trends. List 2 action items.
Keep summaries concise (1 sentence each). Category keys: governance_action, constitution_budget, protocol_parameter, network_ops, security, ecosystem_adoption, dev_tools, institutional, key_person, governance_tool, spo`;

  const userMsg = `Create a monthly governance digest for ${month} based on these daily highlights:\n${allHighlightsText}`;

  try {
    console.log("  Calling Claude Haiku for monthly synthesis...");
    const { text, usage } = await callClaude(systemPrompt, userMsg, 6000);
    console.log(`  Claude usage: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const monthly = JSON.parse(jsonStr);
    monthly.month = month;
    monthly.generatedAt = new Date().toISOString();
    monthly.stats = {
      totalTweets,
      totalHighlights,
      daysWithData: dailyDigests.length,
    };
    monthly.apiUsage = usage;

    // Save to x-monthly-digest.json (array, keep last 12 months)
    const monthlyPath = path.join(DATA_DIR, "x-monthly-digest.json");
    let existing = [];
    try {
      existing = JSON.parse(fs.readFileSync(monthlyPath, "utf-8"));
      if (!Array.isArray(existing)) existing = [existing];
    } catch (_) {}

    // Replace same month or add new
    existing = existing.filter(d => d.month !== month);
    existing.push(monthly);
    existing.sort((a, b) => (b.month || "").localeCompare(a.month || "")); // newest first
    if (existing.length > 12) existing = existing.slice(0, 12);

    fs.writeFileSync(monthlyPath, JSON.stringify(existing, null, 2));
    console.log(`  Monthly digest saved → ${monthlyPath}`);
    console.log(`  Month: ${month}, Highlights: ${(monthly.topHighlights || []).length}, Trends: ${(monthly.trends || []).length}`);

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
