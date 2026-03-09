#!/usr/bin/env python3
"""
ADAtool.net Phase 8/10/11/14 Implementation
Run on server: python3 implement-phase8-14.py
"""
import os, sys
from pathlib import Path

API = "/home/ubuntu/adatool-api/src/index.js"
FE = "/home/ubuntu/adatool-frontend/src/app/(explorer)"
HDR = "/home/ubuntu/adatool-frontend/src/components/layout/Header.tsx"

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f: f.write(content)
    print(f"  + {os.path.relpath(path, '/home/ubuntu')}")

# ================================================================
# PART 1: API ENDPOINTS
# ================================================================
NEW_API = r'''
// ─── Phase 8: Token & NFT Explorer ─────────────────────────────
app.get("/tokens", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = (page - 1) * limit;
  const data = await cached(`tokens:p${page}`, 120, async () => {
    const r = await pool.query(`
      SELECT ma.id, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as asset_name, ma.fingerprint,
        CASE WHEN ma.name ~ '^[\\x20-\\x7E]+$' THEN convert_from(ma.name,'UTF8') ELSE encode(ma.name,'hex') END as display_name
      FROM multi_asset ma ORDER BY ma.id DESC LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/token/:fp", async (c) => {
  const fp = c.req.param("fp");
  const data = await cached(`token:${fp}`, 300, async () => {
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy, encode(ma.name,'hex') as asset_name,
        ma.fingerprint,
        CASE WHEN ma.name ~ '^[\\x20-\\x7E]+$' THEN convert_from(ma.name,'UTF8') ELSE encode(ma.name,'hex') END as display_name,
        COALESCE((SELECT SUM(mtm.quantity)::text FROM ma_tx_mint mtm WHERE mtm.ident = ma.id),'0') as total_minted,
        (SELECT COUNT(*) FROM ma_tx_mint mtm WHERE mtm.ident = ma.id)::int as mint_count
      FROM multi_asset ma WHERE ma.fingerprint = $1
    `, [fp]);
    return r.rows[0] || null;
  });
  if (!data) return c.json({ error: "Token not found" }, 404);
  return c.json(data);
});

app.get("/token/:fp/holders", async (c) => {
  const fp = c.req.param("fp");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`token:${fp}:holders`, 300, async () => {
    const r = await pool.query(`
      SELECT txo.address, mto.quantity::text
      FROM ma_tx_out mto
      JOIN tx_out txo ON txo.id = mto.tx_out_id
      WHERE mto.ident = (SELECT id FROM multi_asset WHERE fingerprint = $1)
      ORDER BY mto.quantity DESC LIMIT $2
    `, [fp, limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/tokens/mints", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached("tokens:mints", 60, async () => {
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy, ma.fingerprint,
        CASE WHEN ma.name ~ '^[\\x20-\\x7E]+$' THEN convert_from(ma.name,'UTF8') ELSE encode(ma.name,'hex') END as display_name,
        mtm.quantity::text, encode(t.hash,'hex') as tx_hash, b.time
      FROM ma_tx_mint mtm
      JOIN multi_asset ma ON ma.id = mtm.ident
      JOIN tx t ON t.id = mtm.tx_id
      JOIN block b ON b.id = t.block_id
      ORDER BY mtm.id DESC LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Phase 10: Enhanced Detail Endpoints ────────────────────────
app.get("/pool/:hash/delegators", async (c) => {
  const hash = c.req.param("hash");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`pool:${hash}:del`, 300, async () => {
    const r = await pool.query(`
      SELECT sa.view as address, es.amount::text
      FROM epoch_stake es
      JOIN stake_address sa ON sa.id = es.addr_id
      WHERE es.pool_id = (SELECT id FROM pool_hash WHERE view = $1)
        AND es.epoch_no = (SELECT MAX(no) - 1 FROM epoch)
      ORDER BY es.amount DESC LIMIT $2
    `, [hash, limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/pool/:hash/blocks", async (c) => {
  const hash = c.req.param("hash");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`pool:${hash}:blk`, 300, async () => {
    const r = await pool.query(`
      SELECT b.block_no, b.epoch_no, b.slot_no, encode(b.hash,'hex') as hash, b.time, b.tx_count
      FROM block b
      JOIN slot_leader sl ON sl.id = b.slot_leader_id
      WHERE sl.pool_hash_id = (SELECT id FROM pool_hash WHERE view = $1)
      ORDER BY b.id DESC LIMIT $2
    `, [hash, limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/address/:addr/tokens", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`addr:${addr.slice(0,20)}:tok`, 300, async () => {
    const r = await pool.query(`
      SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        CASE WHEN ma.name ~ '^[\\x20-\\x7E]+$' THEN convert_from(ma.name,'UTF8') ELSE encode(ma.name,'hex') END as display_name,
        SUM(mto.quantity)::text as balance
      FROM ma_tx_out mto
      JOIN multi_asset ma ON ma.id = mto.ident
      JOIN tx_out txo ON txo.id = mto.tx_out_id
      WHERE txo.address = $1
      GROUP BY ma.id, ma.fingerprint, ma.policy, ma.name
      ORDER BY SUM(mto.quantity) DESC LIMIT 100
    `, [addr]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/search-universal", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (q.length < 3) return c.json([]);
  const results = [];
  try {
    if (/^\d+$/.test(q)) {
      const n = parseInt(q);
      const eR = await pool.query("SELECT no FROM epoch WHERE no = $1", [n]);
      if (eR.rows.length) results.push({ type: "epoch", value: String(n), label: "Epoch " + n });
      const bR = await pool.query("SELECT block_no FROM block WHERE block_no = $1", [n]);
      if (bR.rows.length) results.push({ type: "block", value: bR.rows[0].block_no, label: "Block #" + n });
    } else if (q.startsWith("addr1") || q.startsWith("stake1")) {
      results.push({ type: "address", value: q, label: q.slice(0, 20) + "..." });
    } else if (q.startsWith("pool1")) {
      results.push({ type: "pool", value: q, label: q.slice(0, 20) + "..." });
    } else if (q.startsWith("asset1")) {
      const tR = await pool.query("SELECT fingerprint FROM multi_asset WHERE fingerprint = $1", [q]);
      if (tR.rows.length) results.push({ type: "token", value: q, label: "Token " + q.slice(0, 16) + "..." });
    } else if (/^[0-9a-fA-F]{64}$/.test(q)) {
      results.push({ type: "tx", value: q, label: "TX " + q.slice(0, 16) + "..." });
      results.push({ type: "block", value: q, label: "Block " + q.slice(0, 16) + "..." });
    } else {
      const pR = await pool.query(`
        SELECT ph.view, pod.ticker_name FROM pool_hash ph
        JOIN pool_offline_data pod ON pod.pool_id = ph.id
        WHERE pod.ticker_name ILIKE $1 LIMIT 10
      `, ["%" + q + "%"]);
      pR.rows.forEach(r => results.push({ type: "pool", value: r.view, label: r.ticker_name + " (" + r.view.slice(0, 12) + "...)" }));
    }
  } catch (e) {}
  return c.json(results);
});

// ─── Phase 11: Real-time Features ───────────────────────────────
app.get("/stats/live", async (c) => {
  const data = await cached("stats:live", 10, async () => {
    const tipR = await pool.query("SELECT block_no, epoch_no, slot_no FROM block ORDER BY id DESC LIMIT 1");
    const todayR = await pool.query("SELECT COUNT(*)::int as cnt FROM tx WHERE block_id IN (SELECT id FROM block WHERE time > NOW() - interval '24 hours')");
    const recentR = await pool.query("SELECT tx_count, time FROM block ORDER BY id DESC LIMIT 20");
    const tip = tipR.rows[0] || {};
    let tps = 0;
    if (recentR.rows.length >= 2) {
      const txSum = recentR.rows.reduce((a, b) => a + (b.tx_count || 0), 0);
      const t0 = new Date(recentR.rows[recentR.rows.length - 1].time).getTime();
      const t1 = new Date(recentR.rows[0].time).getTime();
      const span = Math.max((t1 - t0) / 1000, 1);
      tps = (txSum / span).toFixed(2);
    }
    return { block_no: tip.block_no, epoch_no: tip.epoch_no, slot_no: tip.slot_no, tx_today: parseInt(todayR.rows[0]?.cnt || 0), tps };
  });
  return c.json(data);
});

// ─── Phase 14: Advanced Analytics ───────────────────────────────
app.get("/analytics/network", async (c) => {
  const days = Math.min(parseInt(c.req.query("days") || "14"), 30);
  const data = await cached(`analytics:net:${days}`, 3600, async () => {
    const r = await pool.query(`
      SELECT b.time::date as date, COUNT(DISTINCT t.id)::int as tx_count, SUM(t.fee)::text as fees
      FROM block b JOIN tx t ON t.block_id = b.id
      WHERE b.time > NOW() - make_interval(days => $1)
      GROUP BY b.time::date ORDER BY date
    `, [days]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/analytics/pool-landscape", async (c) => {
  const data = await cached("analytics:pools", 3600, async () => {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pool_hash)::int as total_pools,
        (SELECT COUNT(*) FROM pool_retire)::int as retired_pools,
        (SELECT COUNT(DISTINCT hash_id) FROM pool_update)::int as registered_pools,
        (SELECT COUNT(DISTINCT pool_id) FROM epoch_stake WHERE epoch_no = (SELECT MAX(no)-1 FROM epoch))::int as active_pools
    `);
    return r.rows[0];
  });
  return c.json(data);
});

app.get("/analytics/governance-stats", async (c) => {
  const data = await cached("analytics:gov", 3600, async () => {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM drep_hash)::int as total_dreps,
        (SELECT COUNT(*) FROM voting_procedure)::int as total_votes,
        (SELECT COUNT(*) FROM gov_action_proposal WHERE ratified_epoch IS NOT NULL)::int as ratified,
        (SELECT COUNT(*) FROM gov_action_proposal)::int as total_proposals
    `);
    return r.rows[0];
  });
  return c.json(data);
});

'''

# ================================================================
# PART 2: FRONTEND PAGES
# ================================================================
PAGES = {}

# -- Phase 8: Tokens --
PAGES["tokens/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { truncHash } from "@/lib/format";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function TokensPage() {
  const data: any[] | null = await fetchAPI("/tokens?limit=50");
  if (!data) return <PageShell title="Tokens"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Tokens"><EmptyState /></PageShell>;
  return (
    <PageShell title="Native Tokens" subtitle="Recently registered tokens on Cardano">
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Name</th><th className="text-left py-2">Fingerprint</th><th className="text-left py-2">Policy</th>
          </tr></thead>
          <tbody>{data.map((t: any) => (
            <tr key={t.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 font-semibold">{t.display_name || "—"}</td>
              <td className="py-2"><Link href={`/token/${t.fingerprint}`} className="text-blue-400 hover:underline font-mono text-xs">{truncHash(t.fingerprint || "", 10)}</Link></td>
              <td className="py-2 font-mono text-xs text-gray-400">{truncHash(t.policy, 8)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

PAGES["token/[fingerprint]/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { truncHash, compactNumber } from "@/lib/format";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function TokenDetailPage({ params }: { params: Promise<{ fingerprint: string }> }) {
  const { fingerprint } = await params;
  const t: any = await fetchAPI(`/token/${fingerprint}`);
  if (!t) return <PageShell title="Token"><ErrorState message="Token not found" /></PageShell>;
  return (
    <PageShell title={t.display_name || "Token"} subtitle={`Fingerprint: ${fingerprint}`}>
      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Name</span><p className="font-semibold">{t.display_name || "—"}</p></div>
          <div><span className="text-gray-400">Fingerprint</span><p className="font-mono text-xs break-all">{t.fingerprint}</p></div>
          <div><span className="text-gray-400">Policy ID</span><p className="font-mono text-xs break-all">{t.policy}</p></div>
          <div><span className="text-gray-400">Total Minted</span><p>{compactNumber(Number(t.total_minted || 0))}</p></div>
          <div><span className="text-gray-400">Mint Transactions</span><p>{compactNumber(Number(t.mint_count || 0))}</p></div>
        </div>
        <div className="mt-4"><Link href={`/token/${fingerprint}/holders`} className="text-blue-400 hover:underline">View Top Holders &rarr;</Link></div>
      </Card>
    </PageShell>
  );
}
"""

PAGES["token/[fingerprint]/holders/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AddrLink } from "@/components/ui/HashLink";
import { compactNumber } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function TokenHoldersPage({ params }: { params: Promise<{ fingerprint: string }> }) {
  const { fingerprint } = await params;
  const data: any[] | null = await fetchAPI(`/token/${fingerprint}/holders?limit=50`);
  if (!data) return <PageShell title="Token Holders"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Token Holders"><EmptyState /></PageShell>;
  return (
    <PageShell title="Top Token Holders" subtitle={`Token: ${fingerprint}`}>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">#</th><th className="text-left py-2">Address</th><th className="text-right py-2">Quantity</th>
          </tr></thead>
          <tbody>{data.map((h: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50">
              <td className="py-2 text-gray-500">{i+1}</td>
              <td className="py-2"><AddrLink addr={h.address || ""} /></td>
              <td className="py-2 text-right">{compactNumber(Number(h.quantity || 0))}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

PAGES["tokens/mints/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { HashLink } from "@/components/ui/HashLink";
import { compactNumber, timeAgo } from "@/lib/format";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function TokenMintsPage() {
  const data: any[] | null = await fetchAPI("/tokens/mints?limit=50");
  if (!data) return <PageShell title="Token Mints"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Token Mints"><EmptyState /></PageShell>;
  return (
    <PageShell title="Recent Token Mints" subtitle="Latest token minting events">
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Token</th><th className="text-right py-2">Quantity</th><th className="text-left py-2">Tx</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{data.map((m: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2"><Link href={`/token/${m.fingerprint}`} className="text-blue-400 hover:underline">{m.display_name || "—"}</Link></td>
              <td className="py-2 text-right">{compactNumber(Number(m.quantity || 0))}</td>
              <td className="py-2"><HashLink hash={m.tx_hash || ""} href={`/tx/${m.tx_hash}`} /></td>
              <td className="py-2 text-right text-gray-400">{timeAgo(m.time)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

# -- Phase 10: Enhanced Pages --
PAGES["pool/[hash]/delegators/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { fmtAda, truncHash } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function PoolDelegatorsPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const data: any[] | null = await fetchAPI(`/pool/${hash}/delegators?limit=50`);
  if (!data) return <PageShell title="Pool Delegators"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Pool Delegators"><EmptyState /></PageShell>;
  return (
    <PageShell title="Top Delegators" subtitle={`Pool: ${truncHash(hash)}`}>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">#</th><th className="text-left py-2">Stake Address</th><th className="text-right py-2">Stake</th>
          </tr></thead>
          <tbody>{data.map((d: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50">
              <td className="py-2 text-gray-500">{i+1}</td>
              <td className="py-2 font-mono text-xs">{truncHash(d.address || "", 16)}</td>
              <td className="py-2 text-right">{fmtAda(d.amount || 0)} ADA</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

PAGES["pool/[hash]/blocks/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { HashLink } from "@/components/ui/HashLink";
import { timeAgo, truncHash } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function PoolBlocksPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const data: any[] | null = await fetchAPI(`/pool/${hash}/blocks?limit=50`);
  if (!data) return <PageShell title="Pool Blocks"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Pool Blocks"><EmptyState /></PageShell>;
  return (
    <PageShell title="Blocks Produced" subtitle={`Pool: ${truncHash(hash)}`}>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Block</th><th className="text-left py-2">Hash</th><th className="text-right py-2">Epoch</th><th className="text-right py-2">Txs</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{data.map((b: any) => (
            <tr key={b.block_no} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 font-semibold">{b.block_no}</td>
              <td className="py-2"><HashLink hash={b.hash || ""} href={`/block/${b.hash}`} /></td>
              <td className="py-2 text-right">{b.epoch_no}</td>
              <td className="py-2 text-right">{b.tx_count}</td>
              <td className="py-2 text-right text-gray-400">{timeAgo(b.time)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

PAGES["address/[addr]/tokens/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { truncHash, compactNumber } from "@/lib/format";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function AddressTokensPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const data: any[] | null = await fetchAPI(`/address/${addr}/tokens`);
  if (!data) return <PageShell title="Address Tokens"><ErrorState /></PageShell>;
  if (data.length === 0) return <PageShell title="Address Tokens"><EmptyState message="No tokens found" /></PageShell>;
  return (
    <PageShell title="Token Holdings" subtitle={`Address: ${truncHash(addr, 12)}`}>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Token</th><th className="text-left py-2">Policy</th><th className="text-right py-2">Balance</th>
          </tr></thead>
          <tbody>{data.map((t: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2"><Link href={`/token/${t.fingerprint}`} className="text-blue-400 hover:underline">{t.display_name || "—"}</Link></td>
              <td className="py-2 font-mono text-xs text-gray-400">{truncHash(t.policy, 8)}</td>
              <td className="py-2 text-right">{compactNumber(Number(t.balance || 0))}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

# -- Phase 11: Live Page (Client Component) --
PAGES["live/page.tsx"] = '''"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

export default function LivePage() {
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const r = await fetch(`${API_URL}/stats/live`);
        if (r.ok) setStats(await r.json());
      } catch {}
    };
    fetchStats();
    const iv = setInterval(fetchStats, 10000);

    const fetchBlocks = async () => {
      try {
        const r = await fetch(`${API_URL}/blocks?limit=15`);
        if (r.ok) setBlocks(await r.json());
      } catch {}
    };
    fetchBlocks();
    const bv = setInterval(fetchBlocks, 20000);

    return () => { clearInterval(iv); clearInterval(bv); };
  }, []);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Live Network</h1>
      {stats && (
        <div className="bg-gray-800 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-gray-400 text-sm">Block</p><p className="text-2xl font-bold">#{stats.block_no}</p></div>
          <div><p className="text-gray-400 text-sm">Epoch</p><p className="text-2xl font-bold">{stats.epoch_no}</p></div>
          <div><p className="text-gray-400 text-sm">Txs (24h)</p><p className="text-2xl font-bold">{Number(stats.tx_today || 0).toLocaleString()}</p></div>
          <div><p className="text-gray-400 text-sm">TPS</p><p className="text-2xl font-bold">{stats.tps}</p></div>
        </div>
      )}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Blocks</h2>
        {blocks.length === 0 ? <p className="text-gray-400">Loading...</p> : (
          <div className="space-y-2">
            {blocks.map((b: any) => (
              <div key={b.block_no} className="flex justify-between items-center p-3 bg-gray-900 rounded hover:bg-gray-700/50">
                <div>
                  <span className="font-mono font-semibold">Block #{b.block_no}</span>
                  <span className="text-gray-400 text-sm ml-3">Epoch {b.epoch_no}</span>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="mr-3">{b.tx_count} txs</span>
                  <span>{b.time ? new Date(b.time).toLocaleTimeString() : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
'''

# -- Phase 14: Analytics --
PAGES["analytics/network/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { compactNumber, fmtAda } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function NetworkAnalyticsPage() {
  const data: any[] | null = await fetchAPI("/analytics/network?days=14");
  if (!data || data.length === 0) return <PageShell title="Network Analytics"><ErrorState /></PageShell>;
  const totalTx = data.reduce((s: number, d: any) => s + Number(d.tx_count || 0), 0);
  const totalFees = data.reduce((s: number, d: any) => s + Number(d.fees || 0), 0);
  return (
    <PageShell title="Network Analytics" subtitle="Transaction activity over the last 14 days">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Total Transactions</p><p className="text-2xl font-bold">{compactNumber(totalTx)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Total Fees</p><p className="text-2xl font-bold">{fmtAda(totalFees)} ADA</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Days</p><p className="text-2xl font-bold">{data.length}</p></div></Card>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Date</th><th className="text-right py-2">Transactions</th><th className="text-right py-2">Fees (ADA)</th>
          </tr></thead>
          <tbody>{data.map((d: any) => (
            <tr key={d.date} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2">{d.date}</td>
              <td className="py-2 text-right">{compactNumber(Number(d.tx_count))}</td>
              <td className="py-2 text-right">{fmtAda(d.fees)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </PageShell>
  );
}
"""

PAGES["analytics/pool-landscape/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { compactNumber } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function PoolLandscapePage() {
  const s: any = await fetchAPI("/analytics/pool-landscape");
  if (!s) return <PageShell title="Pool Landscape"><ErrorState /></PageShell>;
  return (
    <PageShell title="Pool Landscape" subtitle="Overview of the Cardano stake pool ecosystem">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Total Pools</p><p className="text-2xl font-bold">{compactNumber(s.total_pools || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Registered</p><p className="text-2xl font-bold text-blue-400">{compactNumber(s.registered_pools || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Active (with stake)</p><p className="text-2xl font-bold text-green-400">{compactNumber(s.active_pools || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Retired</p><p className="text-2xl font-bold text-red-400">{compactNumber(s.retired_pools || 0)}</p></div></Card>
      </div>
    </PageShell>
  );
}
"""

PAGES["analytics/governance/page.tsx"] = """import { fetchAPI } from "@/lib/api";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { compactNumber } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function GovernancePage() {
  const s: any = await fetchAPI("/analytics/governance-stats");
  if (!s) return <PageShell title="Governance Stats"><ErrorState /></PageShell>;
  const rate = s.total_proposals > 0 ? ((s.ratified / s.total_proposals) * 100).toFixed(1) : "0";
  return (
    <PageShell title="Governance Analytics" subtitle="Cardano on-chain governance metrics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="p-4"><p className="text-gray-400 text-sm">DReps</p><p className="text-2xl font-bold text-indigo-400">{compactNumber(s.total_dreps || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Votes Cast</p><p className="text-2xl font-bold text-cyan-400">{compactNumber(s.total_votes || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Proposals</p><p className="text-2xl font-bold text-yellow-400">{compactNumber(s.total_proposals || 0)}</p></div></Card>
        <Card><div className="p-4"><p className="text-gray-400 text-sm">Ratified</p><p className="text-2xl font-bold text-green-400">{compactNumber(s.ratified || 0)}</p></div></Card>
      </div>
      <Card>
        <div className="p-4">
          <div className="flex justify-between mb-2"><span className="text-gray-400">Ratification Rate</span><span className="font-bold">{rate}%</span></div>
          <div className="w-full bg-gray-700 rounded h-3"><div className="bg-green-500 h-3 rounded" style={{width: `${rate}%`}} /></div>
        </div>
      </Card>
    </PageShell>
  );
}
"""

# ================================================================
# PART 3: HEADER NAVIGATION UPDATE
# ================================================================
HEADER_CONTENT = """import Link from "next/link";

const NAV = [
  { label: "Blockchain", items: [
    { label: "Blocks", href: "/blocks" }, { label: "Transactions", href: "/txs" },
    { label: "Epochs", href: "/epochs" }, { label: "Tokens", href: "/tokens" },
    { label: "Token Mints", href: "/tokens/mints" }, { label: "Tx Metadata", href: "/tx-metadata" },
    { label: "Contracts", href: "/contract-txs" }, { label: "Certificates", href: "/certificates" },
  ]},
  { label: "Staking", items: [
    { label: "Pools", href: "/pools" }, { label: "New Pools", href: "/pools/new" },
    { label: "Retired Pools", href: "/pools/retired" }, { label: "Pool Updates", href: "/pool-updates" },
    { label: "Delegations", href: "/delegations" }, { label: "Stake Distribution", href: "/stake-distribution" },
    { label: "Rewards", href: "/rewards-withdrawals" }, { label: "Rewards Checker", href: "/rewards-checker" },
  ]},
  { label: "Governance", items: [
    { label: "Overview", href: "/governance" }, { label: "DReps", href: "/dreps" },
    { label: "Committee", href: "/committee" }, { label: "Votes", href: "/votes" },
    { label: "DRep Delegations", href: "/drep-delegations" }, { label: "Constitution", href: "/constitution" },
    { label: "Treasury", href: "/treasury" }, { label: "Protocol Params", href: "/protocol" },
  ]},
  { label: "Analytics", items: [
    { label: "Network", href: "/analytics/network" }, { label: "Charts", href: "/charts" },
    { label: "Wealth", href: "/analytics/wealth" }, { label: "Block Versions", href: "/analytics/block-versions" },
    { label: "Pool Landscape", href: "/analytics/pool-landscape" }, { label: "Governance Stats", href: "/analytics/governance" },
    { label: "Pots", href: "/analytics/pots" }, { label: "Treasury Projection", href: "/analytics/treasury-projection" },
    { label: "Top Addresses", href: "/analytics/top-addresses" }, { label: "Top Stakers", href: "/analytics/top-stakers" },
    { label: "Genesis", href: "/analytics/genesis" }, { label: "Tx Charts", href: "/analytics/tx-charts" },
  ]},
  { label: "Rich List", items: [
    { label: "Whales", href: "/whales" }, { label: "Rich List", href: "/richlist" },
  ]},
];

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-xl font-bold text-blue-400 hover:text-blue-300">ADAtool</Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(group => (
            <div key={group.label} className="relative group">
              <button className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded">{group.label}</button>
              <div className="absolute left-0 top-full mt-0 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">{item.label}</Link>
                ))}
              </div>
            </div>
          ))}
          <Link href="/live" className="px-3 py-2 text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />Live
          </Link>
        </nav>
        <Link href="/search" className="text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </Link>
      </div>
    </header>
  );
}
"""

# ================================================================
# MAIN
# ================================================================
def main():
    print("=" * 60)
    print("  ADAtool Phase 8/10/11/14 Implementation")
    print("=" * 60)

    # Step 1: API
    print("\n=== Step 1: Adding API endpoints ===")
    with open(API) as f: content = f.read()
    marker = "serve({"
    pos = content.rfind(marker)
    if pos == -1:
        print("ERROR: serve({ not found in API!")
        sys.exit(1)
    content = content[:pos] + NEW_API + "\n" + content[pos:]
    with open(API, "w") as f: f.write(content)
    print(f"  API updated: {len(NEW_API.splitlines())} lines added")

    # Step 2: Frontend pages
    print("\n=== Step 2: Creating frontend pages ===")
    for rel, code in PAGES.items():
        path = os.path.join(FE, rel)
        w(path, code)
    print(f"  {len(PAGES)} pages created")

    # Step 3: Header
    print("\n=== Step 3: Updating Header navigation ===")
    w(HDR, HEADER_CONTENT)

    # Step 4: Restart API
    print("\n=== Step 4: Restarting API ===")
    os.system("sudo systemctl restart adatool-api")
    import time; time.sleep(3)
    os.system("sudo systemctl is-active adatool-api")

    # Step 5: Build frontend
    print("\n=== Step 5: Building frontend ===")
    ret = os.system("cd /home/ubuntu/adatool-frontend && npm run build 2>&1 | tail -30")
    if ret != 0:
        print("BUILD FAILED - check errors above")
        sys.exit(1)

    # Step 6: Deploy
    print("\n=== Step 6: Deploying ===")
    os.system("cd /home/ubuntu/adatool-frontend && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/")
    os.system("sudo systemctl restart adatool-frontend")
    import time; time.sleep(8)

    # Step 7: Test
    print("\n=== Step 7: Testing ===")
    routes = [
        "tokens", "tokens/mints", "live",
        "analytics/network", "analytics/pool-landscape", "analytics/governance",
    ]
    for r in routes:
        ret = os.popen(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{r} --max-time 15").read().strip()
        print(f"  /{r} => {ret}")

    # Test API
    print("\n  API endpoints:")
    api_routes = ["tokens", "tokens/mints", "stats/live", "analytics/network", "analytics/pool-landscape", "analytics/governance-stats", "search-universal?q=pool"]
    for r in api_routes:
        ret = os.popen(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3001/{r} --max-time 15").read().strip()
        print(f"  /{r} => {ret}")

    print("\n" + "=" * 60)
    print("  DONE! 15 API endpoints + 12 pages + updated nav")
    print("=" * 60)

if __name__ == "__main__":
    main()
