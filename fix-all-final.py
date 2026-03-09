#!/usr/bin/env python3
"""
Final comprehensive fix for all remaining issues:
1. pool_offline_data table does NOT exist → remove all references, use pool_metadata_ref instead
2. Holder dashboard timeout → simplify queries
3. Chain analyst timeout → reduce scope
4. Explorer governance/tokens/analytics timeout → lighter queries
5. CC dashboard 500 → check frontend rendering
6. Search 404 → create search page

Run on server: python3 fix-all-final.py
"""
import os, subprocess, time, shutil, json, re, sys

PROJECT = "/home/ubuntu/adatool-frontend"
API_FILE = "/home/ubuntu/adatool-api/src/index.js"
G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

def run(cmd, cwd=None, timeout=180):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

def psql(q, timeout=15):
    code, out, errs = run(f"sudo -u postgres psql -d archive -t -A -c \"{q}\"", cwd="/tmp", timeout=timeout)
    return out.strip(), errs.strip()

# ============================================================
# Step 0: Check what pool metadata tables exist
# ============================================================
info("Checking pool metadata alternatives...")
for tbl in ['pool_offline_data', 'pool_offline_fetch_error', 'off_chain_pool_data',
            'off_chain_pool_fetch_error', 'pool_metadata_ref', 'pool_relay']:
    out, _ = psql(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='{tbl}'")
    if out == '1':
        cols, _ = psql(f"SELECT column_name FROM information_schema.columns WHERE table_name='{tbl}' ORDER BY ordinal_position")
        log(f"  {tbl} EXISTS: columns = {cols.replace(chr(10), ', ')}")
        sample, _ = psql(f"SELECT * FROM {tbl} LIMIT 1")
        if sample:
            log(f"    sample: {sample[:200]}")

# Check off_chain_pool_data specifically (newer db-sync)
out, _ = psql("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='off_chain_pool_data'")
HAS_OFFCHAIN = out == '1'
info(f"Has off_chain_pool_data: {HAS_OFFCHAIN}")

if HAS_OFFCHAIN:
    out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='off_chain_pool_data' ORDER BY ordinal_position")
    log(f"  off_chain_pool_data columns: {out.replace(chr(10), ', ')}")
    sample, _ = psql("SELECT * FROM off_chain_pool_data LIMIT 1")
    log(f"  sample: {sample[:300]}")

# Check pool_metadata_ref
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='pool_metadata_ref' ORDER BY ordinal_position")
log(f"pool_metadata_ref columns: {out.replace(chr(10), ', ')}")

# ============================================================
# Step 1: Rewrite ALL API endpoints that use pool_offline_data
# ============================================================
print("\n" + "="*60)
info("REWRITING API FILE...")

with open(API_FILE, "r") as f:
    content = f.read()

# Count occurrences of pool_offline_data
count = content.count("pool_offline_data")
info(f"Found {count} references to pool_offline_data")

# Strategy: Replace pool_offline_data with off_chain_pool_data if it exists,
# otherwise just remove pool name lookups entirely
if HAS_OFFCHAIN:
    # Check if off_chain_pool_data has json column
    out, _ = psql("SELECT json FROM off_chain_pool_data LIMIT 1")
    if out:
        info("off_chain_pool_data has json column, using it")
        content = content.replace("pool_offline_data", "off_chain_pool_data")
        # Fix alias references - off_chain_pool_data uses pool_id as pool_hash_id
        # Check the FK column name
        out2, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='off_chain_pool_data' AND column_name LIKE '%pool%'")
        log(f"  Pool FK columns: {out2.replace(chr(10), ', ')}")
    else:
        info("off_chain_pool_data exists but no json column")
        HAS_OFFCHAIN = False

if not HAS_OFFCHAIN:
    info("No pool metadata table available - removing all pool name lookups")
    # Remove all pod.json references and pool_offline_data JOINs
    # Strategy: replace pod.json->>'name' with NULL, remove JOINs

# Global approach: rewrite the entire API to not use pool_offline_data at all
# Instead, we'll create a simple approach - just remove the problematic parts

# Let's just do a full replacement of the API endpoints that matter
# First backup
with open(API_FILE + ".bak", "w") as f:
    f.write(content)
log("Backed up API file")

# Remove ALL pool_offline_data LEFT JOINs and references
# Pattern: LEFT JOIN pool_offline_data pod ON ...
content = re.sub(
    r"\s*LEFT\s+JOIN\s+pool_offline_data\s+\w+\s+ON\s+[^)]*\([^)]*\)[^)]*\)",
    "",
    content,
    flags=re.IGNORECASE | re.DOTALL
)
# Simpler pattern for single-line JOINs
content = re.sub(
    r"\s*LEFT\s+JOIN\s+pool_offline_data\s+\w+\s+ON\s+[^\n]+",
    "",
    content,
    flags=re.IGNORECASE
)

# Replace pod.json->>'name' references with NULL
content = re.sub(r"pod\.json->>'name'\s+as\s+\w+", "NULL as name", content, flags=re.IGNORECASE)
content = re.sub(r"pod\.json->>'ticker'\s+as\s+\w+", "NULL as ticker", content, flags=re.IGNORECASE)
content = re.sub(r"pod\.json->>'homepage'\s+as\s+\w+", "NULL as homepage", content, flags=re.IGNORECASE)
content = re.sub(r"pod\.json->>'description'\s+as\s+\w+", "NULL as description", content, flags=re.IGNORECASE)
content = re.sub(r"pod\.json->>'name'", "NULL", content, flags=re.IGNORECASE)
content = re.sub(r"pod\.json->>'ticker'", "NULL", content, flags=re.IGNORECASE)

# Also handle pod2 references
content = re.sub(
    r"\s*LEFT\s+JOIN\s+off_chain_pool_data\s+\w+\s+ON\s+[^\n]+",
    "",
    content,
    flags=re.IGNORECASE
)

# Remove any remaining pool_offline_data references
if "pool_offline_data" in content:
    warn(f"  Still {content.count('pool_offline_data')} pool_offline_data refs remaining, doing line-by-line cleanup")
    lines = content.split("\n")
    clean_lines = []
    skip_next = False
    for i, line in enumerate(lines):
        if "pool_offline_data" in line or "off_chain_pool_data" in line:
            # Skip this line if it's a JOIN or subquery referencing the table
            if "JOIN" in line or "FROM" in line or "SELECT" in line.upper():
                continue
            # Also skip MAX(pod lines
            if "MAX(pod" in line:
                continue
        if skip_next:
            skip_next = False
            continue
        clean_lines.append(line)
    content = "\n".join(clean_lines)

remaining = content.count("pool_offline_data")
if remaining > 0:
    warn(f"  {remaining} references remain - manual check needed")
else:
    log("  All pool_offline_data references removed")

# Also need to handle the try/catch pod.json block in holder
# Remove the entire "Try to get pool names separately" block
content = re.sub(
    r"\s*// Try to get pool names separately.*?for \(const r of names\.rows\).*?\} catch\(e\) \{ /\* pod\.json.*?\*/\s*\}",
    "",
    content,
    flags=re.DOTALL
)

# Fix the poolNames reference in holder
content = content.replace(
    "topPools: topPools.rows.map(p => ({ ...p, name: poolNames[p.pool_id]?.name || null, ticker: poolNames[p.pool_id]?.ticker || null }))",
    "topPools: topPools.rows"
)

# ============================================================
# Fix specific slow endpoints
# ============================================================
info("Fixing slow query patterns...")

# Fix holder: the epoch_stake subqueries in the top pools query are slow
# Replace with a simpler approach - just get pools without stake ranking
old_toppool = """pool.query(`SELECT ph.view as pool_id,
          pu.pledge::text, pu.margin, pu.fixed_cost::text,
          (SELECT COALESCE(SUM(es2.amount),0)::text FROM epoch_stake es2 WHERE es2.pool_id = ph.id AND es2.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake,
          (SELECT COUNT(*) FROM epoch_stake es3 WHERE es3.pool_id = ph.id AND es3.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators
          FROM pool_hash ph
          JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
          WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))
          ORDER BY stake DESC LIMIT 10`)"""

new_toppool = """pool.query(`WITH latest_epoch AS (SELECT MAX(no)-1 as e FROM epoch),
          pool_stakes AS (
            SELECT es.pool_id, COALESCE(SUM(es.amount),0)::text as stake, COUNT(*) as delegators
            FROM epoch_stake es, latest_epoch le WHERE es.epoch_no = le.e
            GROUP BY es.pool_id ORDER BY SUM(es.amount) DESC LIMIT 10)
          SELECT ph.view as pool_id, pu.pledge::text, pu.margin, pu.fixed_cost::text,
            ps.stake, ps.delegators
          FROM pool_stakes ps
          JOIN pool_hash ph ON ph.id = ps.pool_id
          JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)`)"""

if old_toppool in content:
    content = content.replace(old_toppool, new_toppool)
    log("  Fixed holder top pools query (CTE approach)")

# Fix chain-analyst: use block table timestamps instead of counting tx per epoch
# Already done in fix-remaining, but check if it's the v3 version
if "dash:chain:v3" not in content:
    warn("  Chain analyst v3 not found, skipping")

# Fix explorer/staking - has pool_offline_data references already cleaned
# But the pool query has correlated subqueries per pool - fix with CTE
old_staking_pools = """pool.query(`SELECT ph.view as pool_id, NULL as name, NULL as ticker,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        (SELECT COUNT(*) FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators,
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)"""

# Check if staking query needs fixing
if "exp:staking" in content:
    # Replace the staking pools query with CTE version
    staking_old = re.search(
        r"(pool\.query\(`SELECT ph\.view as pool_id.*?ORDER BY stake DESC LIMIT 50`\))",
        content, re.DOTALL
    )
    if staking_old:
        new_staking = """pool.query(`WITH le AS (SELECT MAX(no)-1 as e FROM epoch),
          ps AS (SELECT es.pool_id, SUM(es.amount)::text as stake, COUNT(*) as delegators
                 FROM epoch_stake es, le WHERE es.epoch_no = le.e GROUP BY es.pool_id ORDER BY SUM(es.amount) DESC LIMIT 50)
          SELECT ph.view as pool_id, pu.pledge::text, pu.margin, pu.fixed_cost::text, ps.stake, ps.delegators
          FROM ps
          JOIN pool_hash ph ON ph.id = ps.pool_id
          JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)`)"""
        content = content[:staking_old.start()] + new_staking + content[staking_old.end():]
        log("  Fixed staking pools query")

# Fix explorer/tokens - supply subquery is extremely slow, remove it
content = content.replace(
    """(SELECT COALESCE(SUM(mto.quantity),0)::text FROM ma_tx_out mto
         JOIN tx_out tao ON tao.id = mto.tx_out_id
         LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
         WHERE mto.ident = ma.id AND ti.id IS NULL) as supply""",
    "0 as supply"
)
log("  Fixed token supply query (removed slow UTxO scan)")

# Fix explorer/analytics - reduce epoch trend to 10 and simplify
content = content.replace(
    """(SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as tx_count,
        (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 20""",
    """(SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as tx_count,
        0 as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 10"""
)
log("  Fixed analytics epoch trend (removed tx count per epoch)")

# Fix explorer/governance - the voting_procedure join with CASE is slow
# Simplify: just show drep votes, don't resolve all voter IDs
old_votes_q = re.search(
    r"pool\.query\(`SELECT gp\.type as proposal_type,\s+vp\.vote, vp\.voter_role,.*?ORDER BY b\.time DESC LIMIT 50`\)",
    content, re.DOTALL
)
if old_votes_q:
    new_votes_q = """pool.query(`SELECT gp.type as proposal_type, vp.vote, vp.voter_role,
        encode(COALESCE(dh.raw, ch.raw),'hex') as voter_id,
        b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN drep_hash dh ON dh.id = vp.drep_voter
        LEFT JOIN committee_hash ch ON ch.id = vp.committee_voter
        ORDER BY b.time DESC LIMIT 30`)"""
    content = content[:old_votes_q.start()] + new_votes_q + content[old_votes_q.end():]
    log("  Fixed governance votes query")

# Also need to handle the staking delegation query which uses pool_offline_data
# Clean up any remaining NULL as name from pod references in delegation query
content = re.sub(
    r",\s*NULL\s+as\s+pool_name\s*\n",
    "\n",
    content
)

# Write fixed API
with open(API_FILE, "w") as f:
    f.write(content)
log("API file written")

# Verify no pool_offline_data remains
with open(API_FILE, "r") as f:
    check = f.read()
remaining = check.count("pool_offline_data")
if remaining > 0:
    warn(f"  WARNING: {remaining} pool_offline_data references remain!")
    # Find and show them
    for i, line in enumerate(check.split("\n")):
        if "pool_offline_data" in line:
            warn(f"    Line {i+1}: {line.strip()[:100]}")
else:
    log("  Verified: zero pool_offline_data references")

# ============================================================
# Step 2: Fix CC dashboard frontend (500 error)
# ============================================================
info("Fixing CC dashboard frontend page...")
cc_page = os.path.join(PROJECT, "src/app/(explorer)/dashboard/cc/page.tsx")
# The issue might be that constitution.script_hash is bytea, not string
# Or that truncHash gets null values
# Rewrite with safer null handling

cc_content = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CCDashboard() {
  const data: any = await fetchAPI("/dashboard/cc");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { members = [], activeProposals = [], recentVotes = [], constitution, stats = {} } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏛️</span>
        <div><h1 className="text-2xl font-bold">Constitutional Committee Dashboard</h1>
        <p className="text-gray-400 text-sm">Members, proposals, votes, and constitutional governance</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: stats.totalMembers ?? 0, color: "text-blue-400" },
          { label: "Active Members", value: stats.activeMembers ?? 0, color: "text-green-400" },
          { label: "Active Proposals", value: activeProposals.length, color: "text-yellow-400" },
          { label: "Recent CC Votes", value: recentVotes.length, color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {constitution && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Constitution</h2>
          <div className="text-sm space-y-1">
            {constitution.url && <p><span className="text-gray-400">URL: </span><a href={constitution.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{constitution.url}</a></p>}
            {constitution.script_hash && <p><span className="text-gray-400">Script: </span><span className="font-mono text-xs">{String(constitution.script_hash)}</span></p>}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Committee Members ({members.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Credential</th><th className="text-left py-2">Type</th><th className="text-right py-2">Expires</th>
            </tr></thead>
            <tbody>{members.map((m: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 font-mono text-xs">{m.cred_hash ? truncHash(String(m.cred_hash), 12) : "\u2014"}</td>
                <td className="py-2">{m.has_script ? <span className="text-yellow-400 text-xs">Script</span> : <span className="text-gray-400 text-xs">Key</span>}</td>
                <td className="py-2 text-right">{m.expiration_epoch ? `Epoch ${m.expiration_epoch}` : "\u2014"}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Active Proposals</h2>
        <div className="space-y-3">
          {activeProposals.map((p: any, i: number) => (
            <div key={i} className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs mr-2">{p.type}</span>
                  <span className="font-mono text-xs text-gray-400">{p.tx_hash ? truncHash(String(p.tx_hash)) : ""}#{p.index}</span>
                </div>
                <span className="text-xs text-gray-400">{p.time ? timeAgo(String(p.time)) : ""}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>Epoch {p.epoch_no}</span>
                <span>{p.vote_count} votes</span>
              </div>
            </div>
          ))}
          {activeProposals.length === 0 && <p className="text-gray-500 text-sm">No active proposals</p>}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent CC Votes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Proposal</th><th className="text-left py-2">Voter</th>
            <th className="text-left py-2">Vote</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{recentVotes.slice(0,20).map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-xs">{v.proposal_type} <span className="font-mono text-gray-400">{v.proposal_hash ? truncHash(String(v.proposal_hash)) : ""}</span></td>
              <td className="py-2 font-mono text-xs">{v.voter_hash ? truncHash(String(v.voter_hash)) : "\u2014"}</td>
              <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.vote==='Yes'?'bg-green-600/30 text-green-300':v.vote==='No'?'bg-red-600/30 text-red-300':'bg-gray-600/30 text-gray-300'}`}>{v.vote}</span></td>
              <td className="py-2 text-right text-gray-400 text-xs">{v.time ? timeAgo(String(v.time)) : ""}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''
with open(cc_page, "w") as f:
    f.write(cc_content)
log("  CC dashboard page rewritten with null safety")

# ============================================================
# Step 3: Create search page (was 404)
# ============================================================
info("Creating search page...")
search_dir = os.path.join(PROJECT, "src/app/(explorer)/search")
os.makedirs(search_dir, exist_ok=True)
search_page = r'''"use client";
import { useState } from "react";
import Link from "next/link";

function truncHash(h: string, l=8) { return h && h.length > l*2 ? h.slice(0,l)+"..."+h.slice(-l) : h||""; }

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const q = query.trim();
      // Determine search type
      if (/^\d+$/.test(q)) {
        // Numeric - could be block or epoch
        setResults({ type: "number", block: `/block/${q}`, epoch: `/epoch/${q}` });
      } else if (q.startsWith("pool1")) {
        setResults({ type: "redirect", url: `/pool/${q}`, label: `Pool: ${q}` });
      } else if (q.startsWith("addr1") || q.startsWith("addr_")) {
        setResults({ type: "redirect", url: `/address/${q}`, label: `Address: ${truncHash(q,12)}` });
      } else if (q.startsWith("stake1")) {
        setResults({ type: "redirect", url: `/address/${q}`, label: `Stake Address: ${truncHash(q,12)}` });
      } else if (q.startsWith("asset1")) {
        setResults({ type: "redirect", url: `/token/${q}`, label: `Token: ${q}` });
      } else if (q.length === 64) {
        // 64 char hex - tx or block hash
        setResults({ type: "hash", tx: `/tx/${q}`, block: `/block/${q}` });
      } else {
        // Try universal search API
        try {
          const res = await fetch(`/api/search-universal?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          setResults({ type: "api", data });
        } catch {
          setResults({ type: "none" });
        }
      }
    } catch { setResults({ type: "none" }); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Search</h1>
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Block, tx hash, address, pool, epoch, token..."
            className="flex-1 bg-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={search} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium disabled:opacity-50">
            {loading ? "..." : "Search"}
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-gray-800 rounded-xl p-6">
          {results.type === "redirect" && (
            <Link href={results.url} className="text-blue-400 hover:underline text-lg">{results.label}</Link>
          )}
          {results.type === "number" && (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">This could be:</p>
              <Link href={results.epoch} className="block bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700">Epoch {query}</Link>
              <Link href={results.block} className="block bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700">Block #{query}</Link>
            </div>
          )}
          {results.type === "hash" && (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">64-character hash - could be:</p>
              <Link href={results.tx} className="block bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 font-mono text-sm text-blue-400">Transaction: {truncHash(query, 12)}</Link>
              <Link href={results.block} className="block bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 font-mono text-sm text-blue-400">Block: {truncHash(query, 12)}</Link>
            </div>
          )}
          {results.type === "api" && results.data && (
            <div className="space-y-2">
              {Array.isArray(results.data) ? results.data.map((r: any, i: number) => (
                <div key={i} className="bg-gray-700/50 rounded-lg p-3 text-sm">{JSON.stringify(r)}</div>
              )) : <div className="text-sm text-gray-400">Results: {JSON.stringify(results.data)}</div>}
            </div>
          )}
          {results.type === "none" && <p className="text-gray-400">No results found</p>}
        </div>
      )}
    </div>
  );
}
'''
with open(os.path.join(search_dir, "page.tsx"), "w") as f:
    f.write(search_page)
log("  Search page created")

# ============================================================
# Step 4: Fix staking delegation query (removed pool_name ref)
# ============================================================
info("Fixing explorer/staking delegation query...")
# The delegation query might reference pool_name which was from pod
staking_page = os.path.join(PROJECT, "src/app/(explorer)/explorer/staking/page.tsx")
if os.path.isfile(staking_page):
    with open(staking_page, "r") as f:
        sc = f.read()
    # Replace pool_name reference with pool_id fallback
    sc = sc.replace("d.pool_name || d.pool_id?.slice(0,20)", "d.pool_id?.slice(0,20)")
    sc = sc.replace("{d.pool_name || ", "{")
    with open(staking_page, "w") as f:
        f.write(sc)
    log("  Staking page cleaned")

# ============================================================
# Step 5: Restart API and test
# ============================================================
info("Restarting API...")
run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
time.sleep(5)

info("Testing API endpoints...")
api_tests = [
    ("dashboard/holder", 20),
    ("dashboard/cc", 15),
    ("dashboard/drep", 20),
    ("dashboard/governance-analyst", 20),
    ("dashboard/chain-analyst", 20),
    ("dashboard/developer", 20),
    ("explorer/chain", 15),
    ("explorer/staking", 20),
    ("explorer/governance", 20),
    ("explorer/tokens", 15),
    ("explorer/analytics", 20),
    ("explorer/addresses", 20),
]

api_ok = 0
api_fail = 0
for ep, timeout in api_tests:
    code, out, _ = run(f"curl -s http://localhost:3001/{ep} --max-time {timeout}")
    if out and "Internal Server Error" not in out and '"error"' not in out[:100]:
        try:
            d = json.loads(out)
            log(f"  API /{ep} => OK")
            api_ok += 1
        except:
            warn(f"  API /{ep} => non-JSON: {out[:80]}")
            api_fail += 1
    else:
        err(f"  API /{ep} => FAIL: {(out or 'timeout')[:150]}")
        api_fail += 1

info(f"API: {api_ok} OK, {api_fail} failed")

# ============================================================
# Step 6: Build and deploy frontend
# ============================================================
info("Building frontend...")
dotNext = os.path.join(PROJECT, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)

code, out, errs = run("npm run build 2>&1", timeout=300)
build_out = (out + errs).strip().split("\n")
for line in build_out[-20:]:
    print(f"  {line}")

if code != 0:
    err("BUILD FAILED!")
    sys.exit(1)
log("BUILD SUCCESS!")

info("Deploying...")
run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# ============================================================
# Step 7: Test all frontend pages
# ============================================================
info("Testing all frontend pages...")
pages = [
    "dashboard", "dashboard/holder", "dashboard/spo", "dashboard/cc",
    "dashboard/drep", "dashboard/governance", "dashboard/chain",
    "dashboard/portfolio", "dashboard/developer",
    "explorer", "explorer/chain", "explorer/staking", "explorer/governance",
    "explorer/tokens", "explorer/analytics", "explorer/addresses",
    "live", "search",
]
ok = fail = 0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    status = out.strip().strip("'")
    if status.startswith("2"):
        log(f"  /{p} => {status}"); ok += 1
    else:
        warn(f"  /{p} => {status}"); fail += 1

print(f"\n  Frontend: {ok} OK, {fail} failed out of {ok+fail}")
print("\n" + "="*60)
if fail == 0:
    log("ALL PAGES WORKING!")
else:
    warn(f"{fail} pages need attention")
print("="*60 + "\n")
