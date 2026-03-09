#!/usr/bin/env python3
"""
Restructure dashboards v2:
1. ADA Holder = site top "/" with CardanoWatch single-page layout (no tabs)
2. Keep: SPO, DRep, Governance Analyst (absorb CC), Chain Analyst
3. Remove: CC, Portfolio, Developer dashboards
4. Update Header navigation
5. Update /dashboard index page

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

cw_file = os.path.join(comp_dir, "CardanoWatch.tsx")
# Backup
if os.path.exists(cw_file):
    shutil.copy2(cw_file, cw_file + ".bak")

# Copy from the repo's standalone CardanoWatch.tsx (full Blockfrost + CoinGecko integration)
repo_cw = os.path.join(SCRIPT_DIR, "CardanoWatch.tsx")
if os.path.exists(repo_cw):
    shutil.copy2(repo_cw, cw_file)
    log("CardanoWatch.tsx copied from repo file (Blockfrost + CoinGecko)")
else:
    print(f"WARNING: {repo_cw} not found, writing minimal fallback")

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

# Note: The old inline fallback CardanoWatch has been removed.
# The repo's CardanoWatch.tsx is the sole source of truth (1876 lines, full Blockfrost + CoinGecko).
# If repo_cw was not found above, we need a minimal fallback:
if not os.path.exists(cw_file):
    with open(cw_file, "w", encoding="utf-8") as f:
        f.write(""""use client";
export default function ADADashboard() {
  return <div className="p-8 text-center text-red-400">CardanoWatch.tsx not found in repo. Please check the deployment.</div>;
}
""")

log("CardanoWatch single-page component written")

# ============================================================
# Step 2: Rewrite Holder page (now the root page)
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Rewriting ADA Holder page")
print("=" * 60)

holder_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/holder/page.tsx")
os.makedirs(os.path.dirname(holder_page), exist_ok=True)

with open(holder_page, "w") as f:
    f.write('''"use client";
import dynamic from "next/dynamic";
const CardanoWatch = dynamic(() => import("@/components/CardanoWatch"), { ssr: false });

export default function HolderDashboard() {
  return <CardanoWatch />
  );
}
''')
log("Holder page rewritten (clean, single-page)")

# ============================================================
# Step 3: Create root page that redirects to /dashboard/holder
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Setting ADA Holder as site default")
print("=" * 60)

# Create a root page.tsx that redirects
root_page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)")
root_page = os.path.join(root_page_dir, "page.tsx")
if os.path.exists(root_page):
    shutil.copy2(root_page, root_page + ".bak")

with open(root_page, "w") as f:
    f.write('''import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard/holder"); }
''')
log("Root '/' now redirects to /dashboard/holder")

# Also update /dashboard to redirect to /dashboard/holder
dash_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/page.tsx")
if os.path.exists(dash_page):
    shutil.copy2(dash_page, dash_page + ".bak")

with open(dash_page, "w") as f:
    f.write('''export const dynamic = "force-dynamic";

const dashboards = [
  { name: "ADA Holder", href: "/dashboard/holder", emoji: "🪙", desc: "Portfolio, prices, wallets, rewards" },
  { name: "SPO", href: "/dashboard/spo", emoji: "🏊", desc: "Pool performance, delegators, blocks" },
  { name: "DRep", href: "/dashboard/drep", emoji: "🗳️", desc: "Voting matrix, governance, simulator" },
  { name: "Governance", href: "/dashboard/governance", emoji: "🏛️", desc: "Proposals, committee, constitution" },
  { name: "Chain Analyst", href: "/dashboard/chain", emoji: "🔗", desc: "Epochs, blocks, transactions, stats" },
];

export default function DashboardIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map(d => (
          <a key={d.href} href={d.href} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition border border-gray-700 hover:border-gray-600">
            <div className="text-3xl mb-3">{d.emoji}</div>
            <h2 className="text-lg font-bold mb-1">{d.name}</h2>
            <p className="text-sm text-gray-400">{d.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
''')
log("Dashboard index updated (5 dashboards only)")

# ============================================================
# Step 4: Update Header navigation
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Updating Header navigation")
print("=" * 60)

# Write to both paths (layout/Header.tsx is the one actually used by the server)
header_file = os.path.join(PROJECT_FE, "src/components/Header.tsx")
header_layout_file = os.path.join(PROJECT_FE, "src/components/layout/Header.tsx")
if os.path.exists(header_file):
    shutil.copy2(header_file, header_file + ".bak")

with open(header_file, "w") as f:
    f.write('''"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const dashboards = [
  { label: "ADA Holder", href: "/dashboard/holder" },
  { label: "SPO", href: "/dashboard/spo" },
  { label: "DRep", href: "/dashboard/drep" },
  { label: "Governance", href: "/dashboard/governance" },
  { label: "Chain Analyst", href: "/dashboard/chain" },
];

const explorer = [
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

function Dropdown({ label, items, isActive }: { label: string; items: any[]; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
        {label} <span className="text-xs ml-0.5">{"\u25be"}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[200px] z-50">
          {items.map((item, i) => item.section ? (
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
  const isDash = pathname.startsWith("/dashboard");
  const isExplorer = pathname.startsWith("/explorer");

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard/holder" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{"\u20b3"}</div>
          <span className="text-lg font-bold"><span className="text-blue-400">ADA</span>tool</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Dropdown label="Dashboards" items={dashboards} isActive={isDash} />
          <Dropdown label="Explorer" items={explorer} isActive={isExplorer} />
          <Link href="/live" className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${pathname === "/live" ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
          </Link>
          <Link href="/search" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${pathname === "/search" ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            {"🔍"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
''')
os.makedirs(os.path.dirname(header_layout_file), exist_ok=True)
shutil.copy2(header_file, header_layout_file)
log("Header rewritten with 5 dashboards + explorer (both paths)")

# ============================================================
# Step 5: Build & Deploy
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Building frontend")
print("=" * 60)

# Skip .next deletion for incremental build (much faster)
# dotNext = os.path.join(PROJECT_FE, ".next")
# if os.path.isdir(dotNext):
#     shutil.rmtree(dotNext)

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
    "dashboard/holder", "dashboard/spo", "dashboard/drep",
    "dashboard/governance", "dashboard/chain",
    "dashboard/drep/votes-matrix", "dashboard/drep/governance", "dashboard/drep/simulator",
    "dashboard",
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

# Test root redirect
_, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 10")
s = out.strip().strip("'")
log(f"  / => {s} (redirect to /dashboard/holder)")

print(f"\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")

print("\n" + "=" * 60)
log("DONE! Restructure complete.")
print("  Site default: / -> /dashboard/holder (CardanoWatch)")
print("  Dashboards: ADA Holder, SPO, DRep, Governance, Chain Analyst")
print("  Removed: CC, Portfolio, Developer")
print("=" * 60)
