#!/usr/bin/env node
/**
 * AI Analysis Generator for Cardano Governance Dashboard
 *
 * Uses Claude API (Haiku) to analyze DRep voting rationales and generate:
 *   1. DRep tendency profiles (top N by stake)
 *   2. Per-proposal vote reason grouping
 *   3. Action-type tendency summaries
 *
 * Incremental: caches previous analysis, only re-analyzes when new votes appear.
 *
 * Output:
 *   data/ai-drep-tendencies.json
 *   data/ai-proposal-reasons.json
 *   data/ai-action-type-summary.json
 *   data/ai-analysis-cache.json
 *   data/ai-meta.json
 *
 * Usage: CLAUDE_API_KEY=sk-... node scripts/analyze-ai.js [top_N]
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) { console.error("ERROR: CLAUDE_API_KEY env var required"); process.exit(1); }

const DATA_DIR = path.resolve(__dirname, "..", "data");
const TOP_N = parseInt(process.argv[2]) || 100;
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1500;
const THROTTLE_MS = 500; // between API calls
const MIN_NEW_VOTES_FOR_REANALYSIS = 3;

// ─── Helpers ───

function loadJSON(fname) {
  const fp = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf8"));
}

function saveJSON(fname, data) {
  fs.writeFileSync(path.join(DATA_DIR, fname), JSON.stringify(data, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Claude API ───

let totalInputTokens = 0;
let totalOutputTokens = 0;
let apiCallCount = 0;

async function callClaude(systemPrompt, userPrompt, maxTokens = MAX_TOKENS) {
  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Claude API error: ${parsed.error.message}`));
            return;
          }
          apiCallCount++;
          totalInputTokens += parsed.usage?.input_tokens || 0;
          totalOutputTokens += parsed.usage?.output_tokens || 0;
          const text = parsed.content?.[0]?.text || "";
          resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Data Loading ───

function loadAllData() {
  console.log("Loading data files...");
  const dreps = loadJSON("dreps.json") || [];
  const votes = loadJSON("votes.json") || {};
  const proposals = loadJSON("proposals.json") || [];
  const rationales = loadJSON("drep-rationales.json") || {};
  const govInfo = loadJSON("governance-info.json") || {};
  const cache = loadJSON("ai-analysis-cache.json") || { drepCache: {}, proposalCache: {} };

  // Sort DReps by stake (exclude auto-abstain, auto-no-confidence, 0-stake)
  const activeDreps = dreps
    .filter(d => d.drep_id && !d.drep_id.startsWith("drep_always_") && Number(d.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, TOP_N);

  console.log(`  DReps: ${dreps.length} total, ${activeDreps.length} top for analysis`);
  console.log(`  Votes: ${Object.keys(votes).length}`);
  console.log(`  Proposals: ${proposals.length}`);
  console.log(`  Rationales: ${Object.keys(rationales).length} (${Object.values(rationales).filter(r => r.text).length} with text)`);

  return { dreps: activeDreps, allDreps: dreps, votes, proposals, rationales, govInfo, cache };
}

// ─── Step 1: DRep Tendency Analysis ───

async function analyzeDRepTendencies(data) {
  console.log("\n═══ Step 1: DRep Tendency Analysis ═══");
  const { dreps, votes, rationales, cache } = data;
  const result = {};
  let analyzed = 0, cached = 0, skipped = 0;

  for (let i = 0; i < dreps.length; i++) {
    const d = dreps[i];
    const drepId = d.drep_id;
    const drepName = d.name || drepId.slice(0, 20) + "...";

    // Gather votes for this DRep
    const drepVotes = [];
    for (const [key, vote] of Object.entries(votes)) {
      if (key.startsWith(drepId + "__")) {
        const propKey = key.split("__")[1];
        const rationale = rationales[key];
        drepVotes.push({ propKey, vote, rationaleText: rationale?.text || null });
      }
    }

    const voteSpread = { yes: 0, no: 0, abstain: 0 };
    drepVotes.forEach(v => {
      if (v.vote === "Yes") voteSpread.yes++;
      else if (v.vote === "No") voteSpread.no++;
      else if (v.vote === "Abstain") voteSpread.abstain++;
    });

    const withRationale = drepVotes.filter(v => v.rationaleText).length;

    // Check cache — skip if few new votes
    const prevCache = cache.drepCache?.[drepId];
    const prevVoteCount = prevCache?.lastAnalyzedVoteCount || 0;
    const newVotes = drepVotes.length - prevVoteCount;

    if (prevCache?.tendencySummary && newVotes < MIN_NEW_VOTES_FOR_REANALYSIS) {
      // Use cached result
      result[drepId] = {
        name: drepName,
        stake: d.amount,
        rank: i + 1,
        totalVotes: drepVotes.length,
        withRationale,
        voteSpread,
        tendencySummary: prevCache.tendencySummary,
        keyPositions: prevCache.keyPositions || [],
        votingPattern: prevCache.votingPattern || "",
        lastAnalyzedVoteCount: prevCache.lastAnalyzedVoteCount,
        lastAnalyzedAt: prevCache.lastAnalyzedAt,
        cached: true
      };
      cached++;
      continue;
    }

    // Skip DReps with no rationale text at all
    if (withRationale === 0) {
      result[drepId] = {
        name: drepName,
        stake: d.amount,
        rank: i + 1,
        totalVotes: drepVotes.length,
        withRationale: 0,
        voteSpread,
        tendencySummary: "No voting rationales provided.",
        keyPositions: [],
        votingPattern: drepVotes.length > 0 ? "Votes without providing rationale" : "Has not voted",
        lastAnalyzedVoteCount: drepVotes.length,
        lastAnalyzedAt: new Date().toISOString(),
        cached: false
      };
      skipped++;
      continue;
    }

    // Build prompt
    const rationaleTexts = drepVotes
      .filter(v => v.rationaleText)
      .map(v => `[${v.vote}] ${v.rationaleText.slice(0, 800)}`)
      .slice(-30); // Latest 30 rationales max

    let userPrompt;
    if (prevCache?.tendencySummary && newVotes >= MIN_NEW_VOTES_FOR_REANALYSIS) {
      // Incremental update
      const newRationales = drepVotes
        .filter(v => v.rationaleText)
        .slice(-newVotes)
        .map(v => `[${v.vote}] ${v.rationaleText.slice(0, 800)}`);

      userPrompt = `DRep: ${drepName}
Stake: ${(Number(d.amount) / 1e6).toFixed(0)}M ADA (Rank #${i + 1})
Vote spread: Yes=${voteSpread.yes}, No=${voteSpread.no}, Abstain=${voteSpread.abstain}
Previous analysis (${prevVoteCount} votes): ${prevCache.tendencySummary}
Previous positions: ${(prevCache.keyPositions || []).join("; ")}

${newVotes} NEW votes since last analysis:
${newRationales.join("\n---\n")}

Update the analysis considering the new votes.`;
    } else {
      // Full analysis
      userPrompt = `DRep: ${drepName}
Stake: ${(Number(d.amount) / 1e6).toFixed(0)}M ADA (Rank #${i + 1})
Vote spread: Yes=${voteSpread.yes}, No=${voteSpread.no}, Abstain=${voteSpread.abstain}
Rationale-attached votes: ${withRationale}/${drepVotes.length}

Voting rationales:
${rationaleTexts.join("\n---\n")}`;
    }

    const systemPrompt = `You are analyzing a Cardano DRep's voting behavior. Based on their voting rationales, provide:
1. A concise tendency summary (2-3 sentences in Japanese)
2. Key positions as a JSON array of strings (in Japanese, max 5 items)
3. Voting pattern description (1 sentence in Japanese)

Respond in this exact JSON format:
{"tendencySummary":"...","keyPositions":["...","..."],"votingPattern":"..."}`;

    try {
      const response = await callClaude(systemPrompt, userPrompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || "{}");

      result[drepId] = {
        name: drepName,
        stake: d.amount,
        rank: i + 1,
        totalVotes: drepVotes.length,
        withRationale,
        voteSpread,
        tendencySummary: parsed.tendencySummary || "Analysis failed",
        keyPositions: parsed.keyPositions || [],
        votingPattern: parsed.votingPattern || "",
        lastAnalyzedVoteCount: drepVotes.length,
        lastAnalyzedAt: new Date().toISOString(),
        cached: false
      };

      // Update cache
      cache.drepCache[drepId] = {
        lastAnalyzedVoteCount: drepVotes.length,
        lastAnalyzedAt: new Date().toISOString(),
        tendencySummary: parsed.tendencySummary,
        keyPositions: parsed.keyPositions,
        votingPattern: parsed.votingPattern
      };

      analyzed++;
      if (analyzed % 10 === 0) {
        console.log(`  [${analyzed}/${dreps.length}] analyzed (${cached} cached, ${skipped} skipped)`);
      }
      await sleep(THROTTLE_MS);
    } catch (e) {
      console.log(`  ERROR analyzing ${drepName}: ${e.message}`);
      // Use previous cache or mark as failed
      if (prevCache?.tendencySummary) {
        result[drepId] = {
          name: drepName, stake: d.amount, rank: i + 1,
          totalVotes: drepVotes.length, withRationale, voteSpread,
          tendencySummary: prevCache.tendencySummary,
          keyPositions: prevCache.keyPositions || [],
          votingPattern: prevCache.votingPattern || "",
          lastAnalyzedVoteCount: prevCache.lastAnalyzedVoteCount,
          lastAnalyzedAt: prevCache.lastAnalyzedAt,
          cached: true
        };
        cached++;
      } else {
        result[drepId] = {
          name: drepName, stake: d.amount, rank: i + 1,
          totalVotes: drepVotes.length, withRationale, voteSpread,
          tendencySummary: "Analysis error",
          keyPositions: [], votingPattern: "",
          lastAnalyzedVoteCount: drepVotes.length,
          lastAnalyzedAt: new Date().toISOString(),
          cached: false
        };
        skipped++;
      }
      await sleep(2000); // back off on error
    }
  }

  console.log(`  Done: ${analyzed} analyzed, ${cached} cached, ${skipped} skipped`);
  return result;
}

// ─── Step 2: Proposal Vote Reason Analysis ───

async function analyzeProposalReasons(data) {
  console.log("\n═══ Step 2: Proposal Vote Reason Analysis ═══");
  const { dreps, allDreps, votes, proposals, rationales, cache } = data;
  const result = {};

  // Build DRep name lookup
  const drepNames = {};
  allDreps.forEach(d => { if (d.drep_id) drepNames[d.drep_id] = d.name || d.drep_id.slice(0, 15) + "..."; });

  // Focus on active + recently expired proposals
  // Since currentEpoch isn't in governance-info, analyze all proposals with votes
  const proposalsToAnalyze = proposals.filter(p => {
    const propKey = `${p.tx_hash}#${p.cert_index}`;
    // Check if this proposal has any votes with rationales
    const hasRationales = Object.keys(rationales).some(k => k.includes(`__${propKey}`));
    return hasRationales;
  });

  console.log(`  Proposals with rationales: ${proposalsToAnalyze.length}/${proposals.length}`);

  for (let pi = 0; pi < proposalsToAnalyze.length; pi++) {
    const p = proposalsToAnalyze[pi];
    const propKey = `${p.tx_hash}#${p.cert_index}`;

    // Gather all votes + rationales for this proposal
    const propVotes = { yes: [], no: [], abstain: [] };
    let votedWithRationale = 0, votedWithoutRationale = 0;

    for (const [key, vote] of Object.entries(votes)) {
      if (!key.includes(`__${propKey}`)) continue;
      const drepId = key.split("__")[0];
      const rationale = rationales[key];
      const drepName = drepNames[drepId] || drepId.slice(0, 15) + "...";
      const drepStake = allDreps.find(d => d.drep_id === drepId)?.amount || "0";

      const entry = {
        drepId,
        drepName,
        stake: drepStake,
        rationaleText: rationale?.text?.slice(0, 500) || null
      };

      if (vote === "Yes") propVotes.yes.push(entry);
      else if (vote === "No") propVotes.no.push(entry);
      else if (vote === "Abstain") propVotes.abstain.push(entry);

      if (rationale?.text) votedWithRationale++;
      else votedWithoutRationale++;
    }

    const totalVoted = propVotes.yes.length + propVotes.no.length + propVotes.abstain.length;

    // Check cache
    const prevAnalysis = cache.proposalCache?.[propKey];
    if (prevAnalysis && prevAnalysis.voteCountAtAnalysis === totalVoted) {
      result[propKey] = prevAnalysis.analysis;
      continue;
    }

    // Skip if no rationales at all
    if (votedWithRationale === 0) {
      result[propKey] = {
        title: p.title || propKey,
        type: p.proposal_type || "unknown",
        stats: { votedWithRationale: 0, votedWithoutRationale: totalVoted, notVoted: allDreps.length - totalVoted },
        yesReasons: [], noReasons: [], abstainReasons: []
      };
      continue;
    }

    // Build analysis prompt
    const formatVoteGroup = (voteEntries, label) => {
      const withRat = voteEntries.filter(e => e.rationaleText);
      if (withRat.length === 0) return "";
      return `${label} votes with rationale (${withRat.length}):\n` +
        withRat.slice(0, 20).map(e =>
          `- ${e.drepName} (${(Number(e.stake)/1e6).toFixed(0)}M ADA): ${e.rationaleText}`
        ).join("\n");
    };

    const userPrompt = `Governance Action: ${p.title || propKey}
Type: ${p.proposal_type || "unknown"}
Total voted: ${totalVoted} (Yes=${propVotes.yes.length}, No=${propVotes.no.length}, Abstain=${propVotes.abstain.length})
With rationale: ${votedWithRationale}, Without: ${votedWithoutRationale}

${formatVoteGroup(propVotes.yes, "YES")}

${formatVoteGroup(propVotes.no, "NO")}

${formatVoteGroup(propVotes.abstain, "ABSTAIN")}`;

    const systemPrompt = `You analyze Cardano governance action votes. Group the voting rationales into distinct reasons.
For each vote category (Yes/No/Abstain), identify 1-5 distinct reason groups.
Each reason should be a concise summary in Japanese.

Respond in this exact JSON format:
{
  "yesReasons": [{"reason":"理由の要約","drepNames":["name1","name2"]}],
  "noReasons": [{"reason":"理由の要約","drepNames":["name1"]}],
  "abstainReasons": [{"reason":"理由の要約","drepNames":["name1"]}]
}
Only include categories that have rationales. Use the actual DRep names from the input.`;

    try {
      const response = await callClaude(systemPrompt, userPrompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || "{}");

      // Enrich with stake data
      const enrichReasons = (reasons, voteEntries) => {
        return (reasons || []).map(r => {
          const matchedDreps = (r.drepNames || []).map(name => {
            const entry = voteEntries.find(e =>
              e.drepName === name || e.drepName.includes(name) || name.includes(e.drepName)
            );
            return { name, stake: entry?.stake || "0" };
          });
          const totalStake = matchedDreps.reduce((sum, d) => sum + Number(d.stake || 0), 0);
          return { reason: r.reason, totalStake: String(totalStake), dreps: matchedDreps };
        });
      };

      const analysis = {
        title: p.title || propKey,
        type: p.proposal_type || "unknown",
        stats: {
          votedWithRationale,
          votedWithoutRationale,
          notVoted: allDreps.length - totalVoted
        },
        yesReasons: enrichReasons(parsed.yesReasons, propVotes.yes),
        noReasons: enrichReasons(parsed.noReasons, propVotes.no),
        abstainReasons: enrichReasons(parsed.abstainReasons, propVotes.abstain)
      };

      result[propKey] = analysis;
      cache.proposalCache[propKey] = {
        voteCountAtAnalysis: totalVoted,
        analysis
      };

      if ((pi + 1) % 10 === 0) console.log(`  [${pi + 1}/${proposalsToAnalyze.length}] proposals analyzed`);
      await sleep(THROTTLE_MS);
    } catch (e) {
      console.log(`  ERROR analyzing proposal ${p.title}: ${e.message}`);
      result[propKey] = {
        title: p.title || propKey,
        type: p.proposal_type || "unknown",
        stats: { votedWithRationale, votedWithoutRationale, notVoted: allDreps.length - totalVoted },
        yesReasons: [], noReasons: [], abstainReasons: [],
        error: e.message
      };
      await sleep(2000);
    }
  }

  // Also add proposals without rationales
  for (const p of proposals) {
    const propKey = `${p.tx_hash}#${p.cert_index}`;
    if (!result[propKey]) {
      const totalVoted = Object.keys(votes).filter(k => k.includes(`__${propKey}`)).length;
      result[propKey] = {
        title: p.title || propKey,
        type: p.proposal_type || "unknown",
        stats: { votedWithRationale: 0, votedWithoutRationale: totalVoted, notVoted: allDreps.length - totalVoted },
        yesReasons: [], noReasons: [], abstainReasons: []
      };
    }
  }

  console.log(`  Done: ${proposalsToAnalyze.length} proposals analyzed`);
  return result;
}

// ─── Step 3: Action Type Summary ───

async function analyzeActionTypeSummary(data, drepTendencies) {
  console.log("\n═══ Step 3: Action Type Summary ═══");
  const { proposals, votes, rationales } = data;

  // Group proposals by type
  const typeGroups = {};
  proposals.forEach(p => {
    const t = p.proposal_type || "unknown";
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(p);
  });

  const result = {};

  for (const [type, props] of Object.entries(typeGroups)) {
    // Gather all rationales for this type
    const typeRationales = { yes: [], no: [], abstain: [] };
    for (const p of props) {
      const propKey = `${p.tx_hash}#${p.cert_index}`;
      for (const [key, vote] of Object.entries(votes)) {
        if (!key.includes(`__${propKey}`)) continue;
        const rat = rationales[key];
        if (!rat?.text) continue;
        const bucket = vote === "Yes" ? "yes" : vote === "No" ? "no" : "abstain";
        typeRationales[bucket].push(rat.text.slice(0, 300));
      }
    }

    const totalRationales = typeRationales.yes.length + typeRationales.no.length + typeRationales.abstain.length;
    if (totalRationales === 0) {
      result[type] = {
        count: props.length,
        summary: "投票根拠データなし",
        typicalReasonsYes: [],
        typicalReasonsNo: [],
        analysisTokens: 0
      };
      continue;
    }

    // Sample rationales (max 15 per category to control tokens)
    const sampleYes = typeRationales.yes.slice(0, 15).join("\n---\n");
    const sampleNo = typeRationales.no.slice(0, 15).join("\n---\n");
    const sampleAbstain = typeRationales.abstain.slice(0, 10).join("\n---\n");

    const userPrompt = `Action type: ${type} (${props.length} proposals)
Yes rationales (${typeRationales.yes.length} total, showing up to 15):
${sampleYes || "(none)"}

No rationales (${typeRationales.no.length} total, showing up to 15):
${sampleNo || "(none)"}

Abstain rationales (${typeRationales.abstain.length} total, showing up to 10):
${sampleAbstain || "(none)"}`;

    const systemPrompt = `Analyze voting patterns for this Cardano governance action type. Provide in Japanese:
1. Overall summary (2-3 sentences)
2. Typical reasons for Yes votes (array of strings, max 4)
3. Typical reasons for No votes (array of strings, max 4)

Respond in JSON:
{"summary":"...","typicalReasonsYes":["..."],"typicalReasonsNo":["..."]}`;

    try {
      const response = await callClaude(systemPrompt, userPrompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || "{}");

      result[type] = {
        count: props.length,
        summary: parsed.summary || "",
        typicalReasonsYes: parsed.typicalReasonsYes || [],
        typicalReasonsNo: parsed.typicalReasonsNo || []
      };
      await sleep(THROTTLE_MS);
    } catch (e) {
      console.log(`  ERROR analyzing type ${type}: ${e.message}`);
      result[type] = {
        count: props.length,
        summary: "分析エラー",
        typicalReasonsYes: [],
        typicalReasonsNo: []
      };
    }
  }

  console.log(`  Done: ${Object.keys(result).length} action types analyzed`);
  return result;
}

// ─── Main ───

async function main() {
  const startTime = Date.now();
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  AI Analysis Generator (Top ${TOP_N})     ║`);
  console.log(`║  Model: ${CLAUDE_MODEL}  ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  const data = loadAllData();

  // Step 1: DRep Tendencies
  const drepTendencies = await analyzeDRepTendencies(data);
  saveJSON("ai-drep-tendencies.json", {
    generatedAt: new Date().toISOString(),
    tier: `top_${TOP_N}`,
    dreps: drepTendencies
  });
  console.log(`  Saved ai-drep-tendencies.json (${Object.keys(drepTendencies).length} DReps)`);

  // Step 2: Proposal Vote Reasons
  const proposalReasons = await analyzeProposalReasons(data);
  saveJSON("ai-proposal-reasons.json", {
    generatedAt: new Date().toISOString(),
    proposals: proposalReasons
  });
  console.log(`  Saved ai-proposal-reasons.json (${Object.keys(proposalReasons).length} proposals)`);

  // Step 3: Action Type Summary
  const actionTypeSummary = await analyzeActionTypeSummary(data, drepTendencies);
  saveJSON("ai-action-type-summary.json", {
    generatedAt: new Date().toISOString(),
    actionTypes: actionTypeSummary
  });
  console.log(`  Saved ai-action-type-summary.json (${Object.keys(actionTypeSummary).length} types)`);

  // Save cache
  saveJSON("ai-analysis-cache.json", data.cache);

  // Save metadata
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const inputCost = (totalInputTokens / 1e6) * 0.80;
  const outputCost = (totalOutputTokens / 1e6) * 4.0;
  const meta = {
    generatedAt: new Date().toISOString(),
    tier: `top_${TOP_N}`,
    runtime_seconds: parseFloat(elapsed),
    api_calls: apiCallCount,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    estimated_cost_usd: parseFloat((inputCost + outputCost).toFixed(4)),
    stats: {
      drepsAnalyzed: Object.keys(drepTendencies).length,
      proposalsAnalyzed: Object.keys(proposalReasons).length,
      actionTypesAnalyzed: Object.keys(actionTypeSummary).length
    }
  };
  saveJSON("ai-meta.json", meta);

  console.log(`\n═══ Summary ═══`);
  console.log(`  Runtime: ${elapsed}s`);
  console.log(`  API calls: ${apiCallCount}`);
  console.log(`  Tokens: ${totalInputTokens} input + ${totalOutputTokens} output`);
  console.log(`  Est. cost: $${(inputCost + outputCost).toFixed(4)}`);
  console.log(`  Files written: ai-drep-tendencies.json, ai-proposal-reasons.json, ai-action-type-summary.json, ai-meta.json`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
