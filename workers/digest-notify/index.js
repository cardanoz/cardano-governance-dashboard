/**
 * Digest Notification Worker (Cloudflare Workers + D1 + Resend)
 *
 * Endpoints:
 *   POST /subscribe          — Register email (sends confirmation)
 *   GET  /confirm/:token     — Confirm email subscription
 *   GET  /unsubscribe/:token — Unsubscribe
 *   POST /trigger-send       — Send digest emails (called by GitHub Actions)
 *   GET  /health             — Health check
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Email sending via Resend ────────────────────────────────────────────────

async function sendEmail(env, to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cardano Gov Digest <digest@adatool.net>",
      to: [to],
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${env.SITE_URL}>`,
      },
    }),
  });
  return res.ok;
}

// ─── Confirmation email ──────────────────────────────────────────────────────

async function sendConfirmationEmail(env, email, token) {
  const confirmUrl = `https://digest-notify.${env.WORKER_DOMAIN || "workers.dev"}/confirm/${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Cardano Governance Digest</h2>
      <p>Please confirm your subscription to receive governance digest notifications.</p>
      <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Confirm Subscription
      </a>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  return sendEmail(env, email, "Confirm your Cardano Gov Digest subscription", html);
}

// ─── Digest email template ───────────────────────────────────────────────────

function buildDigestEmail(digest, unsubToken, env) {
  const highlights = digest.highlights || [];
  const catIcons = {
    governance_action: "🗳️", constitution_budget: "📜", protocol_parameter: "⚙️",
    network_ops: "🖧", security: "🛡️", ecosystem_adoption: "🌍",
    dev_tools: "🔧", institutional: "🏛️", key_person: "👤",
    governance_tool: "🔗", spo: "🏊",
  };
  const impColors = { 5: "#ef4444", 4: "#f59e0b", 3: "#3b82f6", 2: "#6b7280", 1: "#9ca3af" };

  let highlightHtml = highlights
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 7)
    .map((h) => `
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: ${impColors[h.importance] || "#6b7280"}; color: #fff; font-size: 11px; font-weight: bold;">${h.importance}</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #f3f4f6;">${catIcons[h.category] || "📌"} ${h.category}</span>
        </div>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${h.title_en}</div>
        <div style="font-size: 13px; color: #555; line-height: 1.5;">${h.summary_en}</div>
        ${h.sources ? `<div style="font-size: 10px; color: #999; margin-top: 4px;">Sources: ${h.sources.join(", ")}</div>` : ""}
      </div>
    `)
    .join("");

  const unsubUrl = `https://digest-notify.${env.WORKER_DOMAIN || "workers.dev"}/unsubscribe/${unsubToken}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="font-size: 24px;">📡</span>
        <h1 style="font-size: 18px; margin: 0; color: #1a1a2e;">Cardano Governance Digest</h1>
      </div>
      <div style="font-size: 12px; color: #888; margin-bottom: 16px;">
        ${digest.date} · ${digest.tweetCount || 0} tweets analyzed
      </div>
      ${highlightHtml}
      <div style="margin-top: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <a href="${env.SITE_URL || "https://adatool.net"}/#tab=govhub&date=${digest.date}" style="color: #3b82f6; font-weight: 600; text-decoration: none;">
          View full digest on AdaTool →
        </a>
      </div>
      <div style="margin-top: 20px; font-size: 10px; color: #aaa; text-align: center;">
        Summarized by Claude Haiku · <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </div>
    </div>
  `;
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleSubscribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { email, frequency, categories } = body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }

  const freq = ["daily", "monthly"].includes(frequency) ? frequency : "daily";
  const cats = Array.isArray(categories) ? JSON.stringify(categories) : "[]";
  const confirmToken = generateToken();
  const unsubToken = generateToken();

  try {
    // Upsert: if email exists, update; otherwise insert
    const existing = await env.DB.prepare("SELECT id, active FROM subscriptions WHERE email = ?").bind(email).first();

    if (existing) {
      await env.DB.prepare(
        "UPDATE subscriptions SET frequency = ?, categories = ?, confirm_token = ?, updated_at = datetime('now') WHERE email = ?"
      ).bind(freq, cats, confirmToken, email).run();

      if (existing.active) {
        return json({ ok: true, message: "Preferences updated" });
      }
    } else {
      await env.DB.prepare(
        "INSERT INTO subscriptions (email, frequency, categories, confirm_token, unsubscribe_token) VALUES (?, ?, ?, ?, ?)"
      ).bind(email, freq, cats, confirmToken, unsubToken).run();
    }

    // Send confirmation email
    await sendConfirmationEmail(env, email, confirmToken);
    return json({ ok: true, message: "Confirmation email sent" });
  } catch (err) {
    console.error("Subscribe error:", err);
    return json({ error: "Subscription failed" }, 500);
  }
}

async function handleConfirm(token, env) {
  const sub = await env.DB.prepare("SELECT id, email FROM subscriptions WHERE confirm_token = ?").bind(token).first();
  if (!sub) {
    return new Response("Invalid or expired confirmation link.", { status: 404, headers: CORS_HEADERS });
  }

  await env.DB.prepare("UPDATE subscriptions SET active = 1, confirm_token = NULL, updated_at = datetime('now') WHERE id = ?")
    .bind(sub.id).run();

  const html = `
    <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
      <h2>✅ Subscription Confirmed!</h2>
      <p>You'll now receive Cardano governance digest notifications at <strong>${sub.email}</strong>.</p>
      <a href="https://adatool.net/#tab=govhub">Go to AdaTool Gov Hub →</a>
    </body></html>
  `;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html", ...CORS_HEADERS } });
}

async function handleUnsubscribe(token, env) {
  const sub = await env.DB.prepare("SELECT id, email FROM subscriptions WHERE unsubscribe_token = ?").bind(token).first();
  if (!sub) {
    return new Response("Invalid unsubscribe link.", { status: 404, headers: CORS_HEADERS });
  }

  await env.DB.prepare("UPDATE subscriptions SET active = 0, updated_at = datetime('now') WHERE id = ?")
    .bind(sub.id).run();

  const html = `
    <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
      <h2>Unsubscribed</h2>
      <p>You've been unsubscribed from Cardano governance digest notifications.</p>
      <p style="color: #888; font-size: 13px;">You can re-subscribe anytime at <a href="https://adatool.net/#tab=govhub">AdaTool</a>.</p>
    </body></html>
  `;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html", ...CORS_HEADERS } });
}

async function handleTriggerSend(request, env) {
  // Verify API key
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${env.NOTIFY_API_KEY}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { type, date } = body; // type: "daily" | "monthly"
  if (!type || !date) {
    return json({ error: "type and date required" }, 400);
  }

  // Fetch the digest data
  const digestUrl = type === "monthly"
    ? `${env.DIGEST_BASE_URL}x-monthly-digest.json`
    : `${env.DIGEST_BASE_URL}x-daily-digest.json`;

  const digestRes = await fetch(digestUrl);
  if (!digestRes.ok) {
    return json({ error: "Failed to fetch digest data" }, 502);
  }

  const digestData = await digestRes.json();
  let digest;
  if (type === "daily") {
    const arr = Array.isArray(digestData) ? digestData : [digestData];
    digest = arr.find((d) => d.date === date) || arr[0];
  } else {
    const arr = Array.isArray(digestData) ? digestData : [digestData];
    digest = arr.find((d) => d.month === date) || arr[0];
  }

  if (!digest) {
    return json({ error: "No digest found for date" }, 404);
  }

  // Get active subscribers for this frequency
  const subs = await env.DB.prepare(
    "SELECT email, categories, unsubscribe_token FROM subscriptions WHERE active = 1 AND frequency = ?"
  ).bind(type).all();

  if (!subs.results || subs.results.length === 0) {
    return json({ ok: true, sent: 0, message: "No subscribers" });
  }

  let sent = 0;
  let errors = 0;

  for (const sub of subs.results) {
    // Filter highlights by subscriber's category preferences
    let filteredDigest = { ...digest };
    const userCats = JSON.parse(sub.categories || "[]");
    if (userCats.length > 0 && digest.highlights) {
      filteredDigest = {
        ...digest,
        highlights: digest.highlights.filter((h) => userCats.includes(h.category)),
      };
    }

    if (filteredDigest.highlights && filteredDigest.highlights.length === 0) continue;

    const html = buildDigestEmail(filteredDigest, sub.unsubscribe_token, env);
    const subject = type === "monthly"
      ? `📅 Cardano Governance Monthly - ${date}`
      : `📡 Cardano Governance Digest - ${date}`;

    const ok = await sendEmail(env, sub.email, subject, html);
    if (ok) sent++;
    else errors++;

    // Rate limit: small delay between sends
    if (sent + errors < subs.results.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return json({ ok: true, sent, errors, total: subs.results.length });
}

// ─── Main fetch handler ──────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/subscribe" && request.method === "POST") {
        return handleSubscribe(request, env);
      }
      if (path.startsWith("/confirm/")) {
        const token = path.split("/confirm/")[1];
        return handleConfirm(token, env);
      }
      if (path.startsWith("/unsubscribe/")) {
        const token = path.split("/unsubscribe/")[1];
        return handleUnsubscribe(token, env);
      }
      if (path === "/trigger-send" && request.method === "POST") {
        return handleTriggerSend(request, env);
      }
      if (path === "/health") {
        return json({ ok: true, timestamp: new Date().toISOString() });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal error" }, 500);
    }
  },
};
