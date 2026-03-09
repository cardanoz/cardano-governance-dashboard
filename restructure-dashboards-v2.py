#!/usr/bin/env python3
"""
Restructure dashboards v2 (architecture redesign):
1. "/" = Dashboard (CardanoWatch) - site top page directly
2. Header: ADAtool [search] | Dashboard | Governance | Chain Analysis | Explorer
3. SPO mode integrated into CardanoWatch (checkbox toggle)
4. DRep + Governance merged into /governance
5. Build & deploy

Run on server: python3 restructure-dashboards-v2.py
"""
import os, subprocess, time, shutil

PROJECT_FE = "/home/ubuntu/adatool-frontend"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
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
# Step 1: Copy CardanoWatch component from repo file
# ============================================================
print("=" * 60)
print("STEP 1: Copying CardanoWatch from repo file")
print("=" * 60)

comp_dir = os.path.join(PROJECT_FE, "src/components")
os.makedirs(comp_dir, exist_ok=True)

# Deploy as .jsx to avoid TypeScript errors
cw_file_jsx = os.path.join(comp_dir, "CardanoWatch.jsx")
cw_file_tsx = os.path.join(comp_dir, "CardanoWatch.tsx")

# Backup existing
for f in [cw_file_jsx, cw_file_tsx]:
    if os.path.exists(f):
        shutil.copy2(f, f + ".bak")

# Remove old .tsx if exists (we use .jsx now)
if os.path.exists(cw_file_tsx):
    os.remove(cw_file_tsx)

# Copy from the repo's standalone CardanoWatch.tsx → deploy as .jsx
repo_cw = os.path.join(SCRIPT_DIR, "CardanoWatch.tsx")
if os.path.exists(repo_cw):
    shutil.copy2(repo_cw, cw_file_jsx)
    log("CardanoWatch.tsx copied as CardanoWatch.jsx (DBSync + CoinGecko)")
else:
    print(f"WARNING: {repo_cw} not found, writing minimal fallback")
    with open(cw_file_jsx, "w", encoding="utf-8") as f:
        f.write(""""use client";
export default function ADADashboard() {
  return <div className="p-8 text-center text-red-400">CardanoWatch not found. Check deployment.</div>;
}
""")

# Copy epoch-rates.json to public/ for reward CSV export
repo_epoch = os.path.join(SCRIPT_DIR, "epoch-rates.json")
public_dir = os.path.join(PROJECT_FE, "public")
os.makedirs(public_dir, exist_ok=True)
if os.path.exists(repo_epoch):
    shutil.copy2(repo_epoch, os.path.join(public_dir, "epoch-rates.json"))
    log("epoch-rates.json copied to public/")
else:
    warn("epoch-rates.json not found in repo")

# Install lucide-react if not present
code_lr, _, _ = run("npm ls lucide-react 2>/dev/null | grep -q lucide-react")
if code_lr != 0:
    log("Installing lucide-react...")
    run("npm install lucide-react --save")

log("CardanoWatch component ready")

# ============================================================
# Step 2: Root page "/" = Dashboard (CardanoWatch directly)
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Setting Dashboard as site root '/'")
print("=" * 60)

# Root page renders CardanoWatch directly (no redirect)
root_page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)")
root_page = os.path.join(root_page_dir, "page.tsx")
if os.path.exists(root_page):
    shutil.copy2(root_page, root_page + ".bak")

with open(root_page, "w") as f:
    f.write('''"use client";
import dynamic from "next/dynamic";
const CardanoWatch = dynamic(() => import("@/components/CardanoWatch"), { ssr: false });

export default function Home() {
  return <CardanoWatch />;
}
''')
log("Root '/' now renders Dashboard directly")

# Also keep /dashboard/holder working (redirects to /)
holder_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/holder/page.tsx")
os.makedirs(os.path.dirname(holder_page), exist_ok=True)
with open(holder_page, "w") as f:
    f.write('''import { redirect } from "next/navigation";
export default function HolderRedirect() { redirect("/"); }
''')
log("/dashboard/holder redirects to /")

# /dashboard index page
dash_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/page.tsx")
if os.path.exists(dash_page):
    shutil.copy2(dash_page, dash_page + ".bak")

with open(dash_page, "w") as f:
    f.write('''import { redirect } from "next/navigation";
export default function DashboardRedirect() { redirect("/"); }
''')
log("/dashboard redirects to /")

# ============================================================
# Step 3: Update Header navigation
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Rewriting Header (4 nav items + inline search)")
print("=" * 60)

header_file = os.path.join(PROJECT_FE, "src/components/Header.tsx")
header_layout_file = os.path.join(PROJECT_FE, "src/components/layout/Header.tsx")
if os.path.exists(header_file):
    shutil.copy2(header_file, header_file + ".bak")

with open(header_file, "w") as f:
    f.write('''"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const explorerItems = [
  { label: "Overview", href: "/explorer" },
  { section: "Chain" },
  { label: "Blocks & Transactions", href: "/explorer/chain" },
  { section: "Staking" },
  { label: "Pools & Delegations", href: "/explorer/staking" },
  { section: "Governance" },
  { label: "Proposals & Votes", href: "/explorer/governance" },
  { section: "Assets" },
  { label: "Tokens & Mints", href: "/explorer/tokens" },
  { section: "Analysis" },
  { label: "Network Analytics", href: "/explorer/analytics" },
  { label: "Rich List & Whales", href: "/explorer/addresses" },
];

function ExplorerDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isActive ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
        Explorer <span className="text-xs ml-0.5">{"\u25be"}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[220px] z-50">
          {explorerItems.map((item, i) => item.section ? (
            <div key={i} className="px-3 py-1 text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{item.section}</div>
          ) : (
            <Link key={item.href} href={item.href} className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDash = pathname === "/" || pathname.startsWith("/dashboard");
  const isGov = pathname.startsWith("/governance");
  const isChain = pathname.startsWith("/chain") || pathname === "/dashboard/chain";
  const isExplorer = pathname.startsWith("/explorer");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    inputRef.current?.blur();
  };

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{"\u20b3"}</div>
          <span className="text-lg font-bold hidden sm:inline"><span className="text-blue-400">ADA</span>tool</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className={`flex items-center bg-gray-800 rounded-lg border transition ${searchFocused ? "border-blue-500" : "border-gray-700"}`}>
            <span className="pl-3 text-gray-500 text-sm">{"\\u{1F50D}"}</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search address, tx, block, pool..."
              className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
            {!searchFocused && !query && (
              <kbd className="mr-2 px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-700 rounded font-mono">/</kbd>
            )}
          </div>
        </form>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 shrink-0">
          <Link href="/" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isDash ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Dashboard
          </Link>
          <Link href="/governance" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isGov ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Governance
          </Link>
          <Link href="/dashboard/chain" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isChain ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Chain
          </Link>
          <ExplorerDropdown isActive={isExplorer} />
        </nav>
      </div>
    </header>
  );
}
''')
os.makedirs(os.path.dirname(header_layout_file), exist_ok=True)
shutil.copy2(header_file, header_layout_file)
log("Header rewritten: ADAtool [search] | Dashboard | Governance | Chain | Explorer")

# ============================================================
# Step 4: Create /governance page (merged DRep + Governance)
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Creating merged /governance page")
print("=" * 60)

gov_page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/governance")
os.makedirs(gov_page_dir, exist_ok=True)
gov_page = os.path.join(gov_page_dir, "page.tsx")
if os.path.exists(gov_page):
    shutil.copy2(gov_page, gov_page + ".bak")

with open(gov_page, "w") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";

const API = "/api";

// Tabs for the merged governance page
const TABS = [
  { id: "overview", label: "Overview", emoji: "\\u{1F3DB}" },
  { id: "proposals", label: "Proposals", emoji: "\\u{1F4DC}" },
  { id: "dreps", label: "DReps", emoji: "\\u{1F5F3}" },
  { id: "committee", label: "Committee", emoji: "\\u{1F465}" },
  { id: "constitution", label: "Constitution", emoji: "\\u{2696}" },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function Skel() {
  return <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>;
}

export default function GovernancePage() {
  const [tab, setTab] = useState("overview");
  const [govData, setGovData] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [dreps, setDreps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [govRes, propRes, drepRes] = await Promise.all([
          fetch(`${API}/explorer/governance`).then(r => r.json()).catch(() => null),
          fetch(`${API}/explorer/governance/proposals`).then(r => r.json()).catch(() => []),
          fetch(`${API}/explorer/governance/dreps`).then(r => r.json()).catch(() => []),
        ]);
        setGovData(govRes);
        setProposals(Array.isArray(propRes) ? propRes : propRes?.proposals || []);
        setDreps(Array.isArray(drepRes) ? drepRes : drepRes?.dreps || []);
      } catch (e) {
        console.error("Gov data load error:", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Governance Analysis</h1>
        <p className="text-sm text-gray-400 mt-1">DRep voting, proposals, constitutional committee & governance actions</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total Proposals" value={govData?.totalProposals?.toLocaleString() || "—"} />
            <Stat label="Active Proposals" value={govData?.activeProposals?.toLocaleString() || "—"} />
            <Stat label="Registered DReps" value={govData?.totalDreps?.toLocaleString() || "—"} />
            <Stat label="Active DReps" value={govData?.activeDreps?.toLocaleString() || "—"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Committee Members" value={govData?.committeeMembers?.toLocaleString() || "—"} />
            <Stat label="Committee Threshold" value={govData?.committeeThreshold || "—"} />
            <Stat label="Total Voting Power" value={govData?.totalVotingPower ? `${(govData.totalVotingPower / 1e6).toFixed(0)}M \\u{20B3}` : "—"} />
            <Stat label="Participation Rate" value={govData?.participationRate || "—"} />
          </div>

          {/* Recent proposals preview */}
          <div>
            <h2 className="text-lg font-bold mb-3">Recent Proposals</h2>
            <div className="space-y-2">
              {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><Skel /></div>) :
                proposals.slice(0, 5).map((p, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.title || p.type || "Proposal"}</div>
                        <div className="text-xs text-gray-400 mt-1">{p.type} · {p.status || "Active"}</div>
                      </div>
                      <div className="text-xs text-gray-500 shrink-0">{p.epoch ? `Epoch ${p.epoch}` : ""}</div>
                    </div>
                  </div>
                ))
              }
            </div>
            {proposals.length > 5 && (
              <button onClick={() => setTab("proposals")} className="text-sm text-blue-400 hover:text-blue-300 mt-2">
                View all {proposals.length} proposals →
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "proposals" && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold mb-3">All Governance Proposals</h2>
          {loading ? Array(10).fill(0).map((_, i) => <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><Skel /></div>) :
            proposals.length === 0 ? <p className="text-gray-500">No proposals found</p> :
            proposals.map((p, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{p.title || p.type || "Proposal"}</div>
                    <div className="text-xs text-gray-400 mt-1">{p.type} · Status: {p.status || "—"} · Yes: {p.yesVotes || 0} · No: {p.noVotes || 0} · Abstain: {p.abstainVotes || 0}</div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">{p.epoch ? `Epoch ${p.epoch}` : ""}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "dreps" && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold mb-3">Registered DReps</h2>
          {loading ? Array(10).fill(0).map((_, i) => <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><Skel /></div>) :
            dreps.length === 0 ? <p className="text-gray-500">No DReps found</p> :
            dreps.map((d, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm font-mono truncate">{d.drepId || d.view || "—"}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Voting Power: {d.votingPower ? `${(d.votingPower / 1e6).toFixed(2)}M \\u{20B3}` : "—"} · Votes Cast: {d.votesCast || 0}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${d.active ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                    {d.active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "committee" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Constitutional Committee</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="Members" value={govData?.committeeMembers?.toLocaleString() || "—"} />
            <Stat label="Threshold" value={govData?.committeeThreshold || "—"} />
            <Stat label="Expiry Epoch" value={govData?.committeeExpiry || "—"} />
          </div>
          <p className="text-sm text-gray-400">Detailed committee member information and voting history coming soon.</p>
        </div>
      )}

      {tab === "constitution" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Cardano Constitution</h2>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-300 leading-relaxed">
              The Cardano Constitution defines the foundational governance rules for the Cardano blockchain.
              It establishes the roles of DReps, the Constitutional Committee, and Stake Pool Operators in the governance process.
            </p>
            <a href="/explorer/governance" className="text-sm text-blue-400 hover:text-blue-300 mt-4 inline-block">
              View full constitution details in Explorer →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
''')
log("Merged Governance page created at /governance")

# Redirect old paths to new /governance
for old_path in ["dashboard/drep", "dashboard/governance"]:
    old_dir = os.path.join(PROJECT_FE, f"src/app/(explorer)/{old_path}")
    os.makedirs(old_dir, exist_ok=True)
    old_page = os.path.join(old_dir, "page.tsx")
    if os.path.exists(old_page):
        shutil.copy2(old_page, old_page + ".bak")
    with open(old_page, "w") as f:
        f.write('''import { redirect } from "next/navigation";
export default function RedirectToGov() { redirect("/governance"); }
''')
    log(f"  /{old_path} -> /governance redirect")

# ============================================================
# Step 5: Build & Deploy
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Building frontend")
print("=" * 60)

code, out, errs = run("npm run build 2>&1", timeout=600)
if code != 0:
    err("BUILD FAILED!")
    combined = out + errs
    for line in combined.strip().split("\n")[-40:]:
        print(f"  {line}")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# ============================================================
# Step 6: Test
# ============================================================
print("\n" + "=" * 60)
print("STEP 6: Testing")
print("=" * 60)

pages = [
    "",  # root = Dashboard
    "governance",
    "dashboard/chain",
    "dashboard/holder",  # should redirect to /
    "dashboard",  # should redirect to /
    "dashboard/spo",
    "explorer", "explorer/chain", "explorer/staking", "explorer/governance",
    "explorer/tokens", "explorer/analytics", "explorer/addresses",
    "live", "search",
]
ok = fail = 0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    s = out.strip().strip("'")
    if s.startswith("2") or s.startswith("3"):
        log(f"  /{p} => {s}")
        ok += 1
    else:
        warn(f"  /{p} => {s}")
        fail += 1

print(f"\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")

print("\n" + "=" * 60)
log("DONE! Architecture redesign complete.")
print("  / = Dashboard (CardanoWatch)")
print("  Nav: Dashboard | Governance | Chain | Explorer")
print("  /governance = Merged DRep + Governance Analysis")
print("  Search bar inline in header")
print("=" * 60)
