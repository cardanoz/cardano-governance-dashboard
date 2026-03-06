#!/usr/bin/env node
/**
 * Weekly Digest Generator
 *
 * Generates a weekly summary from accumulated daily digests (Mon–Sun).
 * Runs every Monday to summarize the previous week.
 *
 * Usage:
 *   CLAUDE_API_KEY=xxx node scripts/generate-weekly-digest.js
 *   CLAUDE_API_KEY=xxx node scripts/generate-weekly-digest.js --force
 *   CLAUDE_API_KEY=xxx node scripts/generate-weekly-digest.js --week 2026-W10
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
const weekArgIdx = args.indexOf("--week");
const targetWeek = weekArgIdx >= 0 ? args[weekArgIdx + 1] : null;

// ─── Date / week helpers ─────────────────────────────────────────────────────

/** Get ISO week number and year for a date */
function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

/** Format as "YYYY-Wnn" */
function weekLabel(year, week) {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Get Monday (start) and Sunday (end) dates for an ISO week */
function weekBounds(year, week) {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // Mon=1 ... Sun=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    monday: monday.toISOString().split("T")[0],
    sunday: sunday.toISOString().split("T")[0],
  };
}

/** Get the previous week's label (for auto-mode, run on Monday → summarize last week) */
function previousWeekLabel() {
  const now = new Date();
  const lastWeekDate = new Date(now);
  lastWeekDate.setUTCDate(now.getUTCDate() - 7);
  const { year, week } = getISOWeek(lastWeekDate);
  return weekLabel(year, week);
}

/** Parse "YYYY-Wnn" into { year, week } */
function parseWeekLabel(label) {
  const m = label.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1]), week: parseInt(m[2]) };
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
          resolve({ text: parsed.content?.[0]?.text || "", usage: parsed.usage || {} });
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("Claude API timeout")); });
    req.write(body);
    req.end();
  });
}

// ─── Load daily digests for a date range ─────────────────────────────────────

function loadDailyDigestsForRange(startDate, endDate) {
  // Determine which months we need
  const startMonth = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);
  const months = new Set([startMonth, endMonth]);

  const allDigests = [];
  for (const month of months) {
    const filePath = path.join(DATA_DIR, `x-digest-${month}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(data)) allDigests.push(...data);
    } catch (_) {}
  }

  // Filter to date range
  return allDigests.filter(d => d.date && d.date >= startDate && d.date <= endDate)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Weekly Digest Generator (Claude Haiku)           ║");
  console.log("╚══════════════════════════════════════════════════╝");

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;

  if (!forceRun && !targetWeek && !isMonday) {
    console.log("  Not Monday — skipping. Use --force to run anyway.");
    process.exit(0);
  }

  // Determine target week
  let wk;
  if (targetWeek) {
    wk = parseWeekLabel(targetWeek);
    if (!wk) { console.error(`Invalid week format: ${targetWeek}. Use YYYY-Wnn`); process.exit(1); }
  } else {
    // Auto: summarize previous week
    const prev = previousWeekLabel();
    wk = parseWeekLabel(prev);
  }

  const label = weekLabel(wk.year, wk.week);
  const { monday, sunday } = weekBounds(wk.year, wk.week);
  console.log(`  Target: ${label} (${monday} → ${sunday})`);

  // Load daily digests for this week
  const dailyDigests = loadDailyDigestsForRange(monday, sunday);
  if (dailyDigests.length === 0) {
    console.log(`  No daily digests found for ${label}`);
    process.exit(0);
  }
  console.log(`  Found ${dailyDigests.length} daily digests`);

  // Aggregate highlights (importance >= 3)
  let highlightsText = "";
  let totalTweets = 0;
  let totalHighlights = 0;

  for (const d of dailyDigests) {
    totalTweets += d.tweetCount || 0;
    const important = (d.highlights || []).filter(h => (h.importance || 0) >= 3);
    if (important.length === 0) continue;
    highlightsText += `\n### ${d.date}\n`;
    for (const h of important) {
      totalHighlights++;
      highlightsText += `- [${h.category}][imp:${h.importance}] ${h.title_en}\n`;
    }
  }

  if (totalHighlights === 0) {
    console.log("  No important highlights this week");
    process.exit(0);
  }

  console.log(`  ${totalHighlights} important highlights from ${totalTweets} tweets`);

  // Truncate if too large
  if (highlightsText.length > 6000) {
    highlightsText = highlightsText.slice(0, 6000) + "\n... (truncated)";
  }

  const systemPrompt = `You are a Cardano governance analyst creating a WEEKLY summary digest.
Analyze daily highlights from ${monday} to ${sunday} and produce a concise weekly overview.
Output ONLY valid JSON (no markdown, no explanation):
{
  "week": "${label}",
  "startDate": "${monday}",
  "endDate": "${sunday}",
  "summary_en": "2-3 sentence English overview of the week",
  "summary_ja": "今週の日本語要約（2-3文）",
  "topHighlights": [
    {
      "category": "category_key",
      "title_en": "Title",
      "title_ja": "日本語タイトル",
      "summary_en": "1 sentence why this matters",
      "summary_ja": "日本語要約",
      "importance": 5
    }
  ],
  "actionItems": [
    {
      "action_en": "What to watch next week",
      "action_ja": "来週の注目",
      "audience": ["DRep", "CC", "SPO"]
    }
  ]
}
Select TOP 3-5 most impactful highlights. List 1-2 action items. Keep concise.
Category keys: governance_action, constitution_budget, protocol_parameter, network_ops, security, ecosystem_adoption, dev_tools, institutional, key_person, governance_tool, spo`;

  const userMsg = `Create a weekly ADA digest for ${label} (${monday} to ${sunday}):\n${highlightsText}`;

  try {
    console.log("  Calling Claude Haiku...");
    const { text, usage } = await callClaude(systemPrompt, userMsg, 4000);
    console.log(`  Claude usage: ${usage.input_tokens} in / ${usage.output_tokens} out`);

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const weekly = JSON.parse(jsonStr);
    weekly.week = label;
    weekly.startDate = monday;
    weekly.endDate = sunday;
    weekly.generatedAt = new Date().toISOString();
    weekly.stats = { totalTweets, totalHighlights, daysWithData: dailyDigests.length };
    weekly.apiUsage = usage;

    // Save to x-weekly-digest.json (array, keep last 26 weeks ≈ 6 months)
    const weeklyPath = path.join(DATA_DIR, "x-weekly-digest.json");
    let existing = [];
    try {
      existing = JSON.parse(fs.readFileSync(weeklyPath, "utf-8"));
      if (!Array.isArray(existing)) existing = [existing];
    } catch (_) {}

    existing = existing.filter(d => d.week !== label);
    existing.push(weekly);
    existing.sort((a, b) => (b.week || "").localeCompare(a.week || "")); // newest first
    if (existing.length > 26) existing = existing.slice(0, 26);

    fs.writeFileSync(weeklyPath, JSON.stringify(existing, null, 2));
    console.log(`  Weekly digest saved → ${weeklyPath}`);
    console.log(`  Week: ${label}, Highlights: ${(weekly.topHighlights || []).length}`);

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
