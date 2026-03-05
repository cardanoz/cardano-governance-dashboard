/**
 * Cloudflare Worker: Vote Prediction API
 * Predicts DRep votes on governance actions using Claude Sonnet API
 *
 * Environment Variables (set in wrangler.toml or Cloudflare dashboard):
 *   CLAUDE_API_KEY - Anthropic API key (set as secret: wrangler secret put CLAUDE_API_KEY)
 *   CLAUDE_MODEL   - Model name (default: claude-sonnet-4-5-20250514)
 *   TENDENCIES_URL - URL to ai-drep-tendencies.json
 *
 * KV Namespace:
 *   RATE_LIMIT - For IP-based rate limiting (10 requests/day)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/predict") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    try {
      // Rate limiting
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const today = new Date().toISOString().split("T")[0];
      const rateKey = `rate:${ip}:${today}`;

      let remaining = 10;
      if (env.RATE_LIMIT) {
        const count = parseInt(await env.RATE_LIMIT.get(rateKey) || "0");
        remaining = Math.max(0, 10 - count);
        if (remaining <= 0) {
          return jsonResponse({ error: "Rate limit exceeded. Try again tomorrow.", remaining: 0 }, 429);
        }
        await env.RATE_LIMIT.put(rateKey, String(count + 1), { expirationTtl: 86400 });
        remaining--;
      }

      // Parse request
      const body = await request.json();
      const { text, actionType } = body;

      if (!text || text.trim().length < 10) {
        return jsonResponse({ error: "Governance action text is too short (min 10 chars)" }, 400);
      }

      if (!env.CLAUDE_API_KEY) {
        return jsonResponse({ error: "Server configuration error: API key not set" }, 500);
      }

      // Fetch DRep tendencies
      const tendenciesUrl = env.TENDENCIES_URL || "https://cardanoz.github.io/cardano-governance-dashboard/data/ai-drep-tendencies.json";
      const tendenciesRes = await fetch(tendenciesUrl);
      if (!tendenciesRes.ok) {
        return jsonResponse({ error: "Failed to fetch DRep tendencies data" }, 502);
      }
      const tendencies = await tendenciesRes.json();

      // Select top 30 DReps by stake for prediction
      // dreps can be an object keyed by drepId or an array
      const drepsRaw = tendencies.dreps || {};
      const drepsArray = Array.isArray(drepsRaw)
        ? drepsRaw
        : Object.entries(drepsRaw).map(([id, d]) => ({ ...d, drepId: id }));
      const topDreps = drepsArray
        .sort((a, b) => (b.stake || 0) - (a.stake || 0))
        .slice(0, 15);

      const drepContext = topDreps.map(d => {
        const name = d.name || d.drepId?.slice(0, 12) || "Unknown";
        const tEN = (d.tendencySummary_en || d.tendencySummary || "").slice(0, 150);
        const vp = (d.votingPattern_en || d.votingPattern || "").slice(0, 100);
        return `- ${name} (₳${Math.round((d.stake||0)/1e6)}M): ${tEN} | ${vp}`;
      }).join("\n");

      // Build Claude prompt
      const prompt = `You are an expert on Cardano governance. Given a governance action draft and DRep tendency data, predict how each DRep would likely vote.

## Governance Action
Type: ${actionType || "Unknown"}
Content:
${text.slice(0, 3000)}

## DRep Tendencies (Top 15 by voting power)
${drepContext}

## Instructions
For each DRep above, predict their vote (Yes/No/Abstain) with confidence (0-100) and a SHORT reason (1 sentence max).

Respond in JSON format:
{
  "predictions": [
    {"name": "DRep Name", "vote": "Yes|No|Abstain", "confidence": 75, "reason_en": "English reason", "reason_ja": "Japanese reason"}
  ],
  "summary_en": "Brief English summary of expected overall outcome",
  "summary_ja": "Brief Japanese summary of expected overall outcome"
}

IMPORTANT: Return ONLY valid JSON, no markdown code fences.`;

      // Call Claude API
      const model = env.CLAUDE_MODEL || "claude-sonnet-4-5-20250514";
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        console.error("Claude API error:", err);
        return jsonResponse({ error: "AI prediction failed", remaining }, 502);
      }

      const claudeData = await claudeRes.json();
      const responseText = claudeData.content?.[0]?.text || "";

      // Parse JSON from response
      let result;
      try {
        // Try direct parse first
        result = JSON.parse(responseText);
      } catch {
        // Try extracting JSON from possible markdown fence
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          return jsonResponse({ error: "Failed to parse AI response", remaining }, 500);
        }
      }

      return jsonResponse({ ...result, remaining });

    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error: " + err.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
