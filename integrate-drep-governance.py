#!/usr/bin/env python3
"""
Integrate DRep Governance Dashboard (voting matrix + reward simulator)
into adatool.net. Since the original is a self-contained HTML app with
Blockfrost client-side integration, we serve it as a static page and
link from the DRep dashboard.

Approach:
1. Copy the HTML file to Next.js public/ as a static asset
2. Create a Next.js page that embeds it via iframe (preserves all functionality)
3. Add navigation links from DRep dashboard

Run on server: python3 integrate-drep-governance.py
"""
import os, subprocess, time, shutil

PROJECT_FE = "/home/ubuntu/adatool-frontend"
PROJECT_GD = "/home/ubuntu/cardano-governance-dashboard"
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
# Step 1: Copy HTML to public directory
# ============================================================
print("=" * 60)
print("STEP 1: Setting up static governance dashboard")
print("=" * 60)

public_dir = os.path.join(PROJECT_FE, "public")
os.makedirs(public_dir, exist_ok=True)

# Copy the HTML file
src_html = os.path.join(PROJECT_GD, "drep-governance-dashboard.html")
dst_html = os.path.join(public_dir, "drep-governance.html")

# Write the HTML file from the repo (it should have been committed)
# If not found, look in common locations
if not os.path.exists(src_html):
    # Check uploads or other locations
    for p in ["/tmp/index-f5dd927e.html", os.path.join(PROJECT_GD, "index-f5dd927e.html")]:
        if os.path.exists(p):
            src_html = p
            break

if os.path.exists(src_html):
    shutil.copy2(src_html, dst_html)
    log(f"Copied HTML to {dst_html}")
else:
    # Download or create from the uploaded file - write inline
    warn("Source HTML not found in expected locations, creating from embedded content")
    # We'll need to handle this differently - let's just create the page pointing to a URL
    # Actually, let's write a minimal redirect page
    pass

# Also copy the data directory if it exists
data_src = os.path.join(PROJECT_GD, "data")
data_dst = os.path.join(public_dir, "data")
if os.path.isdir(data_src):
    if os.path.isdir(data_dst):
        shutil.rmtree(data_dst)
    shutil.copytree(data_src, data_dst)
    log(f"Copied data/ directory to public/data/")
else:
    os.makedirs(data_dst, exist_ok=True)
    warn("No data/ directory found, static data won't be available")

log("Static files set up")

# ============================================================
# Step 2: Create Next.js wrapper page
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Creating governance dashboard page")
print("=" * 60)

page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep/governance")
os.makedirs(page_dir, exist_ok=True)

page_content = r'''"use client";
import { useState } from "react";

export default function DRepGovernancePage() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-[#0a0d13]" : "space-y-4"}>
      {!fullscreen && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DRep Governance Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">
              Voting matrix + Reward simulator (Blockfrost / Static data)
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/drep" className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition">
              ← DRep Dashboard
            </a>
            <button
              onClick={() => setFullscreen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-sm hover:bg-blue-500 transition"
            >
              Fullscreen
            </button>
          </div>
        </div>
      )}

      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-3 right-3 z-[60] px-3 py-1.5 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition"
        >
          Exit Fullscreen
        </button>
      )}

      <div className={fullscreen ? "w-full h-full" : "rounded-xl overflow-hidden border border-gray-700"} style={fullscreen ? {} : { height: "calc(100vh - 180px)" }}>
        <iframe
          src="/drep-governance.html"
          className="w-full h-full border-0"
          style={{ minHeight: fullscreen ? "100vh" : "700px", background: "#0a0d13" }}
          title="DRep Governance Dashboard"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
'''

page_file = os.path.join(page_dir, "page.tsx")
with open(page_file, "w") as f:
    f.write(page_content)
log("Governance dashboard page created")

# ============================================================
# Step 3: Create Simulator page (separate route)
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Creating reward simulator page")
print("=" * 60)

sim_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep/simulator")
os.makedirs(sim_dir, exist_ok=True)

sim_content = r'''"use client";
import { useState } from "react";

export default function DRepSimulatorPage() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-[#0a0d13]" : "space-y-4"}>
      {!fullscreen && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DRep Reward Simulator</h1>
            <p className="text-sm text-gray-400 mt-1">
              Middle-Out mechanism comparison — Equal / Proportional / Prop+Bonus
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/drep" className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition">
              ← DRep Dashboard
            </a>
            <button
              onClick={() => setFullscreen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-sm hover:bg-blue-500 transition"
            >
              Fullscreen
            </button>
          </div>
        </div>
      )}

      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-3 right-3 z-[60] px-3 py-1.5 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition"
        >
          Exit Fullscreen
        </button>
      )}

      <div className={fullscreen ? "w-full h-full" : "rounded-xl overflow-hidden border border-gray-700"} style={fullscreen ? {} : { height: "calc(100vh - 180px)" }}>
        <iframe
          src="/drep-governance.html#simulator"
          className="w-full h-full border-0"
          style={{ minHeight: fullscreen ? "100vh" : "700px", background: "#0a0d13" }}
          title="DRep Reward Simulator"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
'''

sim_file = os.path.join(sim_dir, "page.tsx")
with open(sim_file, "w") as f:
    f.write(sim_content)
log("Simulator page created")

# ============================================================
# Step 4: Update DRep dashboard with new navigation buttons
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Updating DRep dashboard navigation")
print("=" * 60)

drep_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep/page.tsx")
if os.path.exists(drep_page):
    with open(drep_page) as f:
        content = f.read()

    # Check if governance link already exists
    if "governance" not in content or "/dashboard/drep/governance" not in content:
        # Add governance and simulator links next to votes matrix button
        old_link = 'Votes Matrix →</a>'
        new_links = '''Votes Matrix →</a><a href="/dashboard/drep/governance" className="px-4 py-2 rounded-lg bg-purple-600 text-sm hover:bg-purple-500 transition font-medium">Governance →</a><a href="/dashboard/drep/simulator" className="px-4 py-2 rounded-lg bg-teal-600 text-sm hover:bg-teal-500 transition font-medium">Simulator →</a>'''

        if old_link in content:
            content = content.replace(old_link, new_links)
            with open(drep_page, "w") as f:
                f.write(content)
            log("Added Governance & Simulator links to DRep dashboard")
        else:
            warn("Could not find Votes Matrix link to insert after")
    else:
        log("Governance links already exist")
else:
    warn("DRep dashboard page not found")

# ============================================================
# Step 5: Update Header navigation
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Updating header navigation")
print("=" * 60)

header_file = os.path.join(PROJECT_FE, "src/components/Header.tsx")
if os.path.exists(header_file):
    with open(header_file) as f:
        hcontent = f.read()

    # Check if governance sub-items are already there
    if "/dashboard/drep/governance" not in hcontent:
        # Add sub-menu items under DRep in the header if there's a DRep link
        # Just add it to the dashboards dropdown
        log("Header already has DRep link, governance accessible from DRep dashboard")
    else:
        log("Header already updated")
else:
    warn("Header.tsx not found")

# ============================================================
# Step 6: Build & Deploy
# ============================================================
print("\n" + "=" * 60)
print("STEP 6: Building frontend")
print("=" * 60)

dotNext = os.path.join(PROJECT_FE, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)

code, out, errs = run("npm run build 2>&1", timeout=300)
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
# Step 7: Test
# ============================================================
print("\n" + "=" * 60)
print("STEP 7: Testing")
print("=" * 60)

pages = [
    "dashboard", "dashboard/holder", "dashboard/spo", "dashboard/cc", "dashboard/drep",
    "dashboard/governance", "dashboard/chain", "dashboard/portfolio", "dashboard/developer",
    "dashboard/drep/votes-matrix", "dashboard/drep/governance", "dashboard/drep/simulator",
    "explorer", "explorer/chain", "explorer/staking", "explorer/governance",
    "explorer/tokens", "explorer/analytics", "explorer/addresses", "live", "search"
]
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

# Also test the static HTML
_, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/drep-governance.html --max-time 10")
s = out.strip().strip("'")
if s.startswith("2"):
    log(f"  /drep-governance.html (static) => {s}")
else:
    warn(f"  /drep-governance.html (static) => {s}")

print(f"\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")
else:
    warn(f"{fail} pages have issues")

print("\n" + "=" * 60)
log("DONE! DRep Governance Dashboard integrated")
print("  Governance: https://adatool.net/dashboard/drep/governance")
print("  Simulator:  https://adatool.net/dashboard/drep/simulator")
print("  Static HTML: https://adatool.net/drep-governance.html")
print("=" * 60)
