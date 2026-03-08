#!/usr/bin/env python3
"""
Comprehensive fix script for adatool-frontend build errors.
Run on server: python3 fix-all-build.py
"""
import os, sys, re, shutil, subprocess
from pathlib import Path

PROJECT = "/home/ubuntu/adatool-frontend"
G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; N = "\033[0m"

def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")

def run(cmd):
    r = subprocess.run(cmd, shell=True, cwd=PROJECT, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

# ============================================================
# Step 1: Fix format.ts - clean version, no duplicates
# ============================================================
def fix_format_ts():
    log("Step 1: Writing clean format.ts...")
    p = os.path.join(PROJECT, "src/lib/format.ts")
    with open(p, "w") as f:
        f.write("""export function lovelaceToAda(lovelace: string | number, decimals = 2): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function truncHash(hash: string, len = 8): string {
  if (!hash || hash.length <= len * 2) return hash || "";
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function compactNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

export function fmtAda(lovelace: string | number): string {
  const n = Number(lovelace) / 1000000;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}
""")
    log(f"  Written {p}")

# ============================================================
# Step 2: Create block/[hash]/page.tsx
# ============================================================
def create_block_page():
    log("Step 2: Creating block/[hash]/page.tsx...")
    d = os.path.join(PROJECT, "src/app/(explorer)/block/[hash]")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "page.tsx"), "w") as f:
        f.write("""import { fetchAPI } from "@/lib/api";
import { lovelaceToAda, truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlockPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const [block, txs] = await Promise.all([
    fetchAPI(`/block/${hash}`),
    fetchAPI(`/block/${hash}/txs`),
  ]);
  if (!block) return <div className="p-8 text-center text-gray-400">Block not found</div>;
  const b: any = block;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Block #{b.block_no}</h1>
      <div className="bg-gray-800 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-gray-400">Epoch</span><p>{b.epoch_no}</p></div>
        <div><span className="text-gray-400">Slot</span><p>{b.slot_no}</p></div>
        <div><span className="text-gray-400">Time</span><p>{b.time ? timeAgo(b.time) : "\\u2014"}</p></div>
        <div><span className="text-gray-400">Txs</span><p>{b.tx_count}</p></div>
        <div className="col-span-2"><span className="text-gray-400">Hash</span><p className="font-mono text-xs break-all">{b.hash}</p></div>
        <div><span className="text-gray-400">Size</span><p>{Number(b.size||0).toLocaleString()} B</p></div>
        <div><span className="text-gray-400">Fees</span><p>{lovelaceToAda(b.fees||0)} ADA</p></div>
        <div className="col-span-2"><span className="text-gray-400">Pool</span>
          <p><Link href={`/pool/${b.pool_hash}`} className="text-blue-400 hover:underline">{b.pool_name||truncHash(b.pool_hash||"")}</Link></p>
        </div>
      </div>
      {Array.isArray(txs) && (txs as any[]).length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Transactions ({(txs as any[]).length})</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Hash</th><th className="text-right py-2">Fee</th><th className="text-right py-2">Output</th>
            </tr></thead>
            <tbody>{(txs as any[]).map((tx: any) => (
              <tr key={tx.hash} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2"><Link href={`/tx/${tx.hash}`} className="text-blue-400 hover:underline font-mono">{truncHash(tx.hash)}</Link></td>
                <td className="py-2 text-right">{lovelaceToAda(tx.fee||0)}</td>
                <td className="py-2 text-right">{lovelaceToAda(tx.out_sum||0)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
""")
    log("  Written block/[hash]/page.tsx")

# ============================================================
# Step 3: Fix ALL api imports across every page.tsx
# ============================================================
def fix_imports():
    log("Step 3: Fixing api imports in all pages...")
    count = 0
    for root, dirs, files in os.walk(os.path.join(PROJECT, "src/app")):
        for fn in files:
            if not fn.endswith(".tsx"): continue
            fp = os.path.join(root, fn)
            with open(fp, "r") as f:
                orig = f.read()
            text = orig
            # Handle: import { api } , import { api, Foo } , import { Foo, api }
            text = re.sub(r'\bapi\b(?=\s*[,}])', 'fetchAPI', text)  # in import destructuring
            text = re.sub(r'(?<=,\s)api\b', 'fetchAPI', text)
            text = re.sub(r'\bawait\s+api\s*\(', 'await fetchAPI(', text)
            # Also handle: const data = api(  or  api<
            text = re.sub(r'(?<!=\s)\bapi\s*(<[^>]*>)?\s*\(', 'fetchAPI\\1(', text)
            # Remove TxSummary import if api module doesn't export it
            text = re.sub(r',\s*TxSummary\b', '', text)
            text = re.sub(r'\bTxSummary\s*,\s*', '', text)
            if text != orig:
                with open(fp, "w") as f:
                    f.write(text)
                rel = os.path.relpath(fp, PROJECT)
                log(f"  Fixed: {rel}")
                count += 1
    log(f"  Total files fixed: {count}")

# ============================================================
# Step 4: Remove duplicate route dirs
# ============================================================
def remove_dupes():
    log("Step 4: Removing duplicate route directories...")
    for d in ["blocks", "txs", "search"]:
        p = os.path.join(PROJECT, "src/app", d)
        if os.path.isdir(p):
            shutil.rmtree(p)
            log(f"  Removed src/app/{d}")

# ============================================================
# Step 5: Clean .next cache
# ============================================================
def clean_cache():
    log("Step 5: Cleaning .next cache...")
    p = os.path.join(PROJECT, ".next")
    if os.path.isdir(p):
        shutil.rmtree(p)
        log("  Removed .next")

# ============================================================
# Step 6: Build
# ============================================================
def build():
    log("Step 6: Building (npm run build)...")
    code, out, errs = run("npm run build 2>&1")
    # Print last 50 lines
    lines = (out + errs).strip().split("\n")
    for line in lines[-50:]:
        print(f"  {line}")
    if code != 0:
        err("BUILD FAILED!")
        return False
    log("BUILD SUCCESS!")
    return True

# ============================================================
# Step 7: Deploy
# ============================================================
def deploy():
    log("Step 7: Deploying...")
    run("cp -r public .next/standalone/")
    run("cp -r .next/static .next/standalone/.next/")
    code, _, e = run("sudo systemctl restart adatool-frontend")
    if code == 0:
        log("  Frontend restarted")
    else:
        warn(f"  Restart issue: {e}")
    import time; time.sleep(3)
    code, out, _ = run("sudo systemctl is-active adatool-frontend")
    log(f"  Service status: {out.strip()}")

# ============================================================
# Step 8: Test all pages
# ============================================================
def test_pages():
    log("Step 8: Testing all pages...")
    import time; time.sleep(2)
    routes = [
        "", "blocks", "txs", "epochs", "pools", "governance", "dreps",
        "committee", "protocol", "stake-distribution", "whales", "richlist", "charts",
        "votes", "drep-delegations", "constitution", "treasury",
        "tx-metadata", "contract-txs", "rewards-withdrawals",
        "delegations", "pools/new", "pools/retired", "pool-updates",
        "certificates", "rewards-checker",
        "analytics/pots", "analytics/treasury-projection",
        "analytics/top-addresses", "analytics/top-stakers",
        "analytics/wealth", "analytics/block-versions",
        "analytics/genesis", "analytics/tx-charts",
    ]
    ok = fail = 0
    for r in routes:
        code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{r} --max-time 15")
        status = out.strip().strip("'")
        name = f"/{r}" if r else "/ (dashboard)"
        if status.startswith("2"):
            log(f"  {name} => {status}")
            ok += 1
        else:
            warn(f"  {name} => {status}")
            fail += 1
    log(f"  Results: {ok} OK, {fail} failed out of {ok+fail}")

# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    print("\n" + "="*70)
    log("Cardano adatool Frontend - Comprehensive Build Fix")
    print("="*70 + "\n")

    if not os.path.isdir(PROJECT):
        err(f"Project not found: {PROJECT}")
        sys.exit(1)

    fix_format_ts()
    create_block_page()
    fix_imports()
    remove_dupes()
    clean_cache()
    if not build():
        sys.exit(1)
    deploy()
    test_pages()

    print("\n" + "="*70)
    log("ALL DONE!")
    print("="*70 + "\n")
