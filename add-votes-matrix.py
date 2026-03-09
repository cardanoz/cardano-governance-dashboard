#!/usr/bin/env python3
"""
Add DRep Votes Matrix feature:
  1. New API endpoint /votes-matrix
  2. New client-side page at /dashboard/drep/votes-matrix
  3. Link from DRep dashboard
Run on server: python3 add-votes-matrix.py
"""
import os, subprocess, time, shutil, re

PROJECT_API = "/home/ubuntu/adatool-api"
PROJECT_FE  = "/home/ubuntu/adatool-frontend"
G = "\033[32m"; R = "\033[31m"; Y = "\033[33m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")

def run(cmd, cwd=None, timeout=300):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_FE, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

# ============================================================
# Step 1: Add /votes-matrix API endpoint
# ============================================================
print("=" * 60)
print("STEP 1: Adding /votes-matrix API endpoint")
print("=" * 60)

api_file = os.path.join(PROJECT_API, "src/index.js")
with open(api_file) as f:
    api = f.read()

# Backup
shutil.copy2(api_file, api_file + ".bak-matrix")
log("API backup created")

# The new endpoint - inserted before the last app.listen or export
votes_matrix_endpoint = r'''

// ══════════════════════════════════════════════
// DRep Votes Matrix
// ══════════════════════════════════════════════
app.get("/votes-matrix", async (c) => {
  try {
    const data = await cached("votes-matrix:v1", 120, async () => {
      // 1) Get active/recent governance proposals (last 50)
      const proposalsQ = await pool.query(`
        SELECT gp.id, encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
          gp.deposit::text, gp.expiration,
          va.url as anchor_url,
          b.time, b.epoch_no,
          gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
          gp.description::text as description
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      const proposals = proposalsQ.rows.map(p => ({
        ...p,
        status: p.enacted_epoch ? "Enacted" : p.ratified_epoch ? "Ratified"
          : p.dropped_epoch ? "Dropped" : p.expired_epoch ? "Expired" : "Active"
      }));

      // 2) Get all DReps with delegation counts
      const drepsQ = await pool.query(`
        SELECT dh.id as drep_id, encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script,
          COALESCE(cnt.c, 0) as delegations
        FROM drep_hash dh
        LEFT JOIN (
          SELECT drep_hash_id, COUNT(*) as c FROM delegation_vote GROUP BY drep_hash_id
        ) cnt ON cnt.drep_hash_id = dh.id
        ORDER BY delegations DESC
        LIMIT 100
      `);

      // 3) Get all votes for these proposals
      const propIds = proposals.map(p => p.id);
      let votes = [];
      if (propIds.length > 0) {
        const votesQ = await pool.query(`
          SELECT vp.gov_action_proposal_id as proposal_id,
            vp.vote,
            vp.voter_role,
            CASE
              WHEN vp.drep_voter IS NOT NULL THEN vp.drep_voter
              WHEN vp.committee_voter IS NOT NULL THEN vp.committee_voter
              WHEN vp.pool_voter IS NOT NULL THEN vp.pool_voter
            END as voter_id,
            CASE
              WHEN vp.drep_voter IS NOT NULL THEN 'DRep'
              WHEN vp.committee_voter IS NOT NULL THEN 'CC'
              WHEN vp.pool_voter IS NOT NULL THEN 'SPO'
            END as voter_type
          FROM voting_procedure vp
          WHERE vp.gov_action_proposal_id = ANY($1)
        `, [propIds]);
        votes = votesQ.rows;
      }

      // 4) Build the DRep vote map: { drep_id: { proposal_id: vote } }
      const drepVoteMap = {};
      for (const v of votes) {
        if (v.voter_type !== "DRep") continue;
        const did = String(v.voter_id);
        if (!drepVoteMap[did]) drepVoteMap[did] = {};
        drepVoteMap[did][String(v.proposal_id)] = v.vote;
      }

      // 5) Also build SPO and CC vote maps for summary stats
      const spoVotes = {};
      const ccVotes = {};
      for (const v of votes) {
        const pid = String(v.proposal_id);
        if (v.voter_type === "SPO") {
          if (!spoVotes[pid]) spoVotes[pid] = { Yes: 0, No: 0, Abstain: 0 };
          spoVotes[pid][v.vote] = (spoVotes[pid][v.vote] || 0) + 1;
        } else if (v.voter_type === "CC") {
          if (!ccVotes[pid]) ccVotes[pid] = { Yes: 0, No: 0, Abstain: 0 };
          ccVotes[pid][v.vote] = (ccVotes[pid][v.vote] || 0) + 1;
        }
      }

      // 6) Build per-proposal vote summaries
      const proposalVoteSummary = {};
      for (const p of proposals) {
        const pid = String(p.id);
        const drepYes = votes.filter(v => v.voter_type === "DRep" && String(v.proposal_id) === pid && v.vote === "Yes").length;
        const drepNo = votes.filter(v => v.voter_type === "DRep" && String(v.proposal_id) === pid && v.vote === "No").length;
        const drepAbstain = votes.filter(v => v.voter_type === "DRep" && String(v.proposal_id) === pid && v.vote === "Abstain").length;
        proposalVoteSummary[pid] = {
          drep: { yes: drepYes, no: drepNo, abstain: drepAbstain },
          spo: spoVotes[pid] || { Yes: 0, No: 0, Abstain: 0 },
          cc: ccVotes[pid] || { Yes: 0, No: 0, Abstain: 0 }
        };
      }

      return {
        proposals: proposals.map(p => ({
          id: p.id,
          tx_hash: p.tx_hash,
          index: p.index,
          type: p.type,
          status: p.status,
          time: p.time,
          epoch_no: p.epoch_no,
          anchor_url: p.anchor_url,
          expiration: p.expiration,
          description: p.description,
          voteSummary: proposalVoteSummary[String(p.id)] || { drep: {}, spo: {}, cc: {} }
        })),
        dreps: drepsQ.rows.map(d => ({
          drep_id: d.drep_id,
          drep_hash: d.drep_hash,
          view: d.view,
          has_script: d.has_script,
          delegations: Number(d.delegations),
          votes: drepVoteMap[String(d.drep_id)] || {}
        })),
        totalVotes: votes.length
      };
    });
    return c.json(data);
  } catch(e) {
    console.error("votes-matrix error:", e);
    return c.json({ error: e.message }, 500);
  }
});
'''

# Find the right insertion point - before the last few lines (serve/export)
# Look for patterns like "export default app" or "serve(" or the last endpoint
if "export default" in api:
    api = api.replace("export default", votes_matrix_endpoint + "\nexport default", 1)
elif "serve(" in api:
    api = api.replace("serve(", votes_matrix_endpoint + "\nserve(", 1)
else:
    # Just append before the end
    api += votes_matrix_endpoint

with open(api_file, "w") as f:
    f.write(api)
log("votes-matrix endpoint added to API")

# Syntax check
code, out, errs = run(f"node --check {api_file}", cwd=PROJECT_API)
if code != 0:
    err(f"API syntax error: {out} {errs}")
    # Restore backup
    shutil.copy2(api_file + ".bak-matrix", api_file)
    err("Restored API backup")
    exit(1)
log("API syntax OK")

# Restart API
run("sudo systemctl restart adatool-api")
time.sleep(5)
code, out, _ = run("sudo systemctl is-active adatool-api")
if out.strip() == "active":
    log("API restarted successfully")
else:
    err("API failed to restart!")
    code, out, _ = run("sudo journalctl -u adatool-api --no-pager -n 15 2>&1")
    print(out)
    # Restore
    shutil.copy2(api_file + ".bak-matrix", api_file)
    run("sudo systemctl restart adatool-api")
    exit(1)

# Quick test
time.sleep(3)
code, out, _ = run("curl -s http://localhost:3001/votes-matrix --max-time 30")
if out and "proposals" in out:
    log("votes-matrix API endpoint working!")
    # Show stats
    import json
    try:
        d = json.loads(out)
        print(f"  Proposals: {len(d.get('proposals', []))}")
        print(f"  DReps: {len(d.get('dreps', []))}")
        print(f"  Total votes: {d.get('totalVotes', 0)}")
    except:
        print(f"  Response: {out[:200]}")
else:
    warn(f"votes-matrix response: {out[:300]}")

# ============================================================
# Step 2: Create Votes Matrix Frontend Page (Client Component)
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Creating Votes Matrix frontend page")
print("=" * 60)

# Create directory
page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep/votes-matrix")
os.makedirs(page_dir, exist_ok=True)
log(f"Created directory: {page_dir}")

page_content = r'''"use client";
import { useState, useEffect, useMemo, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Type badge colors
const TYPE_COLORS: Record<string, string> = {
  TreasuryWithdrawals: "bg-yellow-600/30 text-yellow-300",
  InfoAction: "bg-blue-600/30 text-blue-300",
  ParameterChange: "bg-purple-600/30 text-purple-300",
  HardForkInitiation: "bg-red-600/30 text-red-300",
  NoConfidence: "bg-red-600/30 text-red-300",
  NewCommittee: "bg-orange-600/30 text-orange-300",
  NewConstitution: "bg-teal-600/30 text-teal-300",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-600/30 text-green-300",
  Enacted: "bg-blue-600/30 text-blue-300",
  Ratified: "bg-cyan-600/30 text-cyan-300",
  Expired: "bg-gray-600/30 text-gray-400",
  Dropped: "bg-red-600/30 text-red-300",
};

const VOTE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  Yes: { label: "✓", color: "text-green-300", bg: "bg-green-600/40" },
  No: { label: "✗", color: "text-red-300", bg: "bg-red-600/40" },
  Abstain: { label: "—", color: "text-gray-400", bg: "bg-gray-600/30" },
};

function truncHash(h: string, n = 8) {
  if (!h || h.length <= n * 2) return h || "";
  return h.slice(0, n) + "..." + h.slice(-n);
}

function timeAgo(t: string) {
  const diff = Date.now() - new Date(t).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Proposal = {
  id: number;
  tx_hash: string;
  index: number;
  type: string;
  status: string;
  time: string;
  epoch_no: number;
  anchor_url: string;
  expiration: number;
  description: string;
  voteSummary: {
    drep: { yes: number; no: number; abstain: number };
    spo: { Yes: number; No: number; Abstain: number };
    cc: { Yes: number; No: number; Abstain: number };
  };
};

type DRep = {
  drep_id: number;
  drep_hash: string;
  view: string;
  has_script: boolean;
  delegations: number;
  votes: Record<string, string>;
};

type MatrixData = {
  proposals: Proposal[];
  dreps: DRep[];
  totalVotes: number;
};

export default function VotesMatrixPage() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDrep, setSearchDrep] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState<"delegations" | "votes">("delegations");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [hoveredCell, setHoveredCell] = useState<{ drep: number; proposal: number } | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    fetch(`${API}/votes-matrix`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    if (!data) return [];
    return data.proposals.filter(p => {
      if (filterType !== "All" && p.type !== filterType) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      return true;
    });
  }, [data, filterType, filterStatus]);

  // Filtered & sorted DReps
  const filteredDreps = useMemo(() => {
    if (!data) return [];
    let dreps = data.dreps.filter(d => {
      if (searchDrep) {
        const q = searchDrep.toLowerCase();
        return (d.view || "").toLowerCase().includes(q) ||
               (d.drep_hash || "").toLowerCase().includes(q);
      }
      return true;
    });
    const propIds = new Set(filteredProposals.map(p => String(p.id)));
    dreps.sort((a, b) => {
      if (sortBy === "delegations") {
        return sortDir === "desc" ? b.delegations - a.delegations : a.delegations - b.delegations;
      }
      // Sort by number of votes cast on visible proposals
      const aVotes = Object.keys(a.votes).filter(k => propIds.has(k)).length;
      const bVotes = Object.keys(b.votes).filter(k => propIds.has(k)).length;
      return sortDir === "desc" ? bVotes - aVotes : aVotes - bVotes;
    });
    return dreps;
  }, [data, searchDrep, sortBy, sortDir, filteredProposals]);

  // Unique types and statuses
  const types = useMemo(() => {
    if (!data) return [];
    return ["All", ...Array.from(new Set(data.proposals.map(p => p.type)))];
  }, [data]);

  const statuses = useMemo(() => {
    if (!data) return [];
    return ["All", ...Array.from(new Set(data.proposals.map(p => p.status)))];
  }, [data]);

  // CSV Export
  const exportCSV = useCallback(() => {
    if (!data) return;
    const headers = ["DRep", "View", "Delegations", ...filteredProposals.map(p => `${p.type}#${p.index}`)];
    const rows = filteredDreps.map(d => [
      d.drep_hash,
      d.view || "",
      d.delegations,
      ...filteredProposals.map(p => d.votes[String(p.id)] || "")
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "drep-votes-matrix.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [data, filteredProposals, filteredDreps]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">No data</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">DRep Votes Matrix</h1>
          <p className="text-sm text-gray-400 mt-1">
            {data.proposals.length} proposals · {data.dreps.length} DReps · {data.totalVotes} votes
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/drep" className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition">
            ← DRep Dashboard
          </a>
          <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg bg-blue-600 text-sm hover:bg-blue-500 transition">
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search DRep (name or hash)..."
              value={searchDrep}
              onChange={e => setSearchDrep(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-700 text-sm border border-gray-600"
            >
              {types.map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-700 text-sm border border-gray-600"
            >
              {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
          </div>
          <div>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={e => {
                const [by, dir] = e.target.value.split("-") as ["delegations" | "votes", "desc" | "asc"];
                setSortBy(by); setSortDir(dir);
              }}
              className="px-3 py-2 rounded-lg bg-gray-700 text-sm border border-gray-600"
            >
              <option value="delegations-desc">Delegations ↓</option>
              <option value="delegations-asc">Delegations ↑</option>
              <option value="votes-desc">Votes Cast ↓</option>
              <option value="votes-asc">Votes Cast ↑</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 rounded bg-green-600/40 text-green-300 text-center leading-5">✓</span> Yes</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 rounded bg-red-600/40 text-red-300 text-center leading-5">✗</span> No</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 rounded bg-gray-600/30 text-gray-400 text-center leading-5">—</span> Abstain</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-5 rounded bg-gray-800 border border-gray-700 text-center leading-5"></span> No Vote</span>
      </div>

      {/* Matrix */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs" style={{ minWidth: "100%" }}>
            <thead>
              {/* Proposal type row */}
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 bg-gray-800 z-20 px-3 py-2 text-left min-w-[200px]" rowSpan={3}>
                  <span className="text-gray-300 font-semibold">DRep</span>
                </th>
                <th className="sticky left-[200px] bg-gray-800 z-20 px-2 py-2 text-right min-w-[80px]" rowSpan={3}>
                  <span className="text-gray-300 font-semibold">Delegations</span>
                </th>
                {filteredProposals.map(p => (
                  <th key={p.id} className="px-1 py-1 text-center min-w-[40px]">
                    <span className={`px-1 py-0.5 rounded text-[10px] whitespace-nowrap ${TYPE_COLORS[p.type] || "bg-gray-600/30 text-gray-300"}`}>
                      {p.type.replace("TreasuryWithdrawals", "Treasury").replace("HardForkInitiation", "HardFork").replace("ParameterChange", "Param").replace("NoConfidence", "NoConf").replace("NewCommittee", "NewCC").replace("NewConstitution", "NewConst").replace("InfoAction", "Info")}
                    </span>
                  </th>
                ))}
              </tr>
              {/* Proposal status row */}
              <tr className="border-b border-gray-700">
                {filteredProposals.map(p => (
                  <th key={p.id} className="px-1 py-1 text-center">
                    <span className={`px-1 py-0.5 rounded text-[10px] ${STATUS_COLORS[p.status] || "bg-gray-600/30"}`}>
                      {p.status}
                    </span>
                  </th>
                ))}
              </tr>
              {/* Proposal index row */}
              <tr className="border-b border-gray-700">
                {filteredProposals.map(p => (
                  <th
                    key={p.id}
                    className="px-1 py-1 text-center cursor-pointer hover:bg-gray-700/50"
                    onClick={() => setSelectedProposal(selectedProposal?.id === p.id ? null : p)}
                    title={`${p.type} #${p.index}\n${p.tx_hash}\n${p.time}`}
                  >
                    <span className="text-gray-400 font-mono">#{p.index}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Vote summary row */}
              <tr className="border-b-2 border-gray-600 bg-gray-750">
                <td className="sticky left-0 bg-gray-800 z-10 px-3 py-2 font-semibold text-gray-300">
                  Vote Summary
                </td>
                <td className="sticky left-[200px] bg-gray-800 z-10 px-2 py-2 text-right text-gray-400">
                  —
                </td>
                {filteredProposals.map(p => {
                  const s = p.voteSummary?.drep || { yes: 0, no: 0, abstain: 0 };
                  const total = (s.yes || 0) + (s.no || 0) + (s.abstain || 0);
                  return (
                    <td key={p.id} className="px-1 py-1 text-center">
                      {total > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-green-400">{s.yes || 0}</span>
                          <span className="text-red-400">{s.no || 0}</span>
                          <span className="text-gray-500">{s.abstain || 0}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600">0</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* DRep rows */}
              {filteredDreps.map(d => (
                <tr key={d.drep_id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="sticky left-0 bg-gray-800 z-10 px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {d.has_script && <span className="text-yellow-400 text-[10px]" title="Script DRep">⚡</span>}
                      <span className="font-mono text-gray-300 truncate max-w-[170px]" title={d.drep_hash}>
                        {d.view || truncHash(d.drep_hash, 10)}
                      </span>
                    </div>
                  </td>
                  <td className="sticky left-[200px] bg-gray-800 z-10 px-2 py-1.5 text-right font-bold text-gray-300">
                    {d.delegations.toLocaleString()}
                  </td>
                  {filteredProposals.map(p => {
                    const vote = d.votes[String(p.id)];
                    const vd = vote ? VOTE_DISPLAY[vote] : null;
                    const isHovered = hoveredCell?.drep === d.drep_id && hoveredCell?.proposal === p.id;
                    return (
                      <td
                        key={p.id}
                        className={`px-1 py-1.5 text-center transition-colors ${
                          vd ? vd.bg : "bg-transparent"
                        } ${isHovered ? "ring-1 ring-blue-400" : ""}`}
                        onMouseEnter={() => setHoveredCell({ drep: d.drep_id, proposal: p.id })}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={vote ? `${d.view || truncHash(d.drep_hash, 6)} voted ${vote} on ${p.type}#${p.index}` : "No vote"}
                      >
                        {vd ? (
                          <span className={`font-bold ${vd.color}`}>{vd.label}</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected proposal detail */}
      {selectedProposal && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[selectedProposal.type] || "bg-gray-600/30"}`}>
                  {selectedProposal.type}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[selectedProposal.status] || "bg-gray-600/30"}`}>
                  {selectedProposal.status}
                </span>
                <span className="text-gray-400 text-xs">Epoch {selectedProposal.epoch_no}</span>
              </div>
              <p className="font-mono text-xs text-gray-400 mb-1">
                TX: {selectedProposal.tx_hash}#{selectedProposal.index}
              </p>
              {selectedProposal.anchor_url && (
                <p className="text-xs">
                  <a href={selectedProposal.anchor_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                    {selectedProposal.anchor_url}
                  </a>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{timeAgo(selectedProposal.time)}</p>
            </div>
            <button
              onClick={() => setSelectedProposal(null)}
              className="text-gray-400 hover:text-gray-200 px-2"
            >
              ✕
            </button>
          </div>
          {/* Vote breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">DRep Votes</p>
              <div className="flex gap-2">
                <span className="text-green-400">✓ {selectedProposal.voteSummary?.drep?.yes || 0}</span>
                <span className="text-red-400">✗ {selectedProposal.voteSummary?.drep?.no || 0}</span>
                <span className="text-gray-400">— {selectedProposal.voteSummary?.drep?.abstain || 0}</span>
              </div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">SPO Votes</p>
              <div className="flex gap-2">
                <span className="text-green-400">✓ {selectedProposal.voteSummary?.spo?.Yes || 0}</span>
                <span className="text-red-400">✗ {selectedProposal.voteSummary?.spo?.No || 0}</span>
                <span className="text-gray-400">— {selectedProposal.voteSummary?.spo?.Abstain || 0}</span>
              </div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">CC Votes</p>
              <div className="flex gap-2">
                <span className="text-green-400">✓ {selectedProposal.voteSummary?.cc?.Yes || 0}</span>
                <span className="text-red-400">✗ {selectedProposal.voteSummary?.cc?.No || 0}</span>
                <span className="text-gray-400">— {selectedProposal.voteSummary?.cc?.Abstain || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="text-xs text-gray-500 text-center py-2">
        Showing {filteredDreps.length} DReps × {filteredProposals.length} proposals
        {searchDrep && ` (filtered by "${searchDrep}")`}
      </div>
    </div>
  );
}
'''

page_file = os.path.join(page_dir, "page.tsx")
with open(page_file, "w") as f:
    f.write(page_content)
log("Votes matrix page created")

# ============================================================
# Step 3: Add link from DRep dashboard to votes matrix
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Adding link from DRep dashboard")
print("=" * 60)

drep_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep/page.tsx")
if os.path.exists(drep_page):
    with open(drep_page) as f:
        drep_content = f.read()

    # Add a link button after the h1
    if "Votes Matrix" not in drep_content:
        drep_content = drep_content.replace(
            '<h1 className="text-2xl font-bold">',
            '<div className="flex items-center justify-between"><h1 className="text-2xl font-bold">'
        )
        # Find the closing of h1 and add button after
        drep_content = drep_content.replace(
            '</h1>',
            '</h1><a href="/dashboard/drep/votes-matrix" className="px-4 py-2 rounded-lg bg-blue-600 text-sm hover:bg-blue-500 transition font-medium">Votes Matrix →</a></div>',
            1
        )
        with open(drep_page, "w") as f:
            f.write(drep_content)
        log("Added Votes Matrix link to DRep dashboard")
    else:
        log("Votes Matrix link already exists")
else:
    warn("DRep dashboard page not found")

# ============================================================
# Step 4: Build & Deploy Frontend
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Building frontend")
print("=" * 60)

dotNext = os.path.join(PROJECT_FE, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)

code, out, errs = run("npm run build 2>&1", timeout=300)
if code != 0:
    err("BUILD FAILED!")
    combined = out + errs
    for line in combined.strip().split("\n")[-30:]:
        print(f"  {line}")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# ============================================================
# Step 5: Test
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Testing")
print("=" * 60)

# Test votes matrix page
_, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/dashboard/drep/votes-matrix --max-time 25")
status = out.strip().strip("'")
if status.startswith("2"):
    log(f"/dashboard/drep/votes-matrix => {status}")
else:
    warn(f"/dashboard/drep/votes-matrix => {status}")

# Test existing pages still work
pages = ["dashboard","dashboard/holder","dashboard/spo","dashboard/cc","dashboard/drep",
         "dashboard/governance","dashboard/chain","dashboard/portfolio","dashboard/developer",
         "explorer","explorer/chain","explorer/staking","explorer/governance",
         "explorer/tokens","explorer/analytics","explorer/addresses","live","search",
         "dashboard/drep/votes-matrix"]
ok = fail = 0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    s = out.strip().strip("'")
    if s.startswith("2"):
        log(f"  /{p} => {s}")
        ok += 1
    else:
        warn(f"  /{p} => {s}")
        fail += 1

print(f"\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")
else:
    warn(f"{fail} pages have issues")

print("\n" + "=" * 60)
log("DONE! Votes Matrix deployed at /dashboard/drep/votes-matrix")
print("=" * 60)
