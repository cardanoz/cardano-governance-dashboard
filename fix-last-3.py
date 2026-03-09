#!/usr/bin/env python3
"""
Fix the last 3 slow explorer pages:
- /explorer/governance: simplify voting_procedure query
- /explorer/analytics: use pre-computed block counts only
- /explorer/addresses: limit rich list scan scope

Run on server: python3 fix-last-3.py
"""
import os, subprocess, time, shutil, json, re, sys

PROJECT = "/home/ubuntu/adatool-frontend"
API_FILE = "/home/ubuntu/adatool-api/src/index.js"
G = "\033[32m"; R = "\033[31m"; C = "\033[36m"; Y = "\033[33m"; N = "\033[0m"
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

print("="*60)
info("Fixing last 3 slow explorer endpoints")
print("="*60)

with open(API_FILE, "r") as f:
    content = f.read()

# ============================================================
# Fix 1: Explorer Governance - remove pool_voter join, simplify
# ============================================================
old_gov = re.search(
    r'// --- Explorer: Governance ---\napp\.get\("/explorer/governance".*?\n\}\);',
    content, re.DOTALL
)
if old_gov:
    new_gov = r'''// --- Explorer: Governance ---
app.get("/explorer/governance", async (c) => {
  try {
    const data = await cached("exp:governance:v2", 120, async () => {
      const [proposals, dreps, committee, recentVotes, constitution, params] = await Promise.all([
        pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
          gp.deposit::text, gp.expiration,
          va.url as anchor_url,
          b.time, b.epoch_no,
          gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
          (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id) as vote_count
          FROM gov_action_proposal gp
          JOIN tx t ON t.id = gp.tx_id
          JOIN block b ON b.id = t.block_id
          LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
          ORDER BY b.time DESC LIMIT 30`),
        pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script,
          COALESCE(cnt.c, 0) as delegations
          FROM drep_hash dh
          LEFT JOIN (SELECT drep_hash_id, COUNT(*) as c FROM delegation_vote GROUP BY drep_hash_id) cnt ON cnt.drep_hash_id = dh.id
          ORDER BY delegations DESC LIMIT 30`),
        pool.query(`SELECT ch.id, encode(ch.raw,'hex') as cred_hash, ch.has_script,
          cm.expiration_epoch
          FROM committee_member cm
          JOIN committee_hash ch ON ch.id = cm.committee_hash_id`),
        pool.query(`SELECT gp.type as proposal_type, vp.vote, vp.voter_role,
          b.time
          FROM voting_procedure vp
          JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
          JOIN tx t ON t.id = vp.tx_id
          JOIN block b ON b.id = t.block_id
          ORDER BY t.id DESC LIMIT 30`),
        pool.query(`SELECT c.script_hash, va.url, va.data_hash
          FROM constitution c
          LEFT JOIN voting_anchor va ON va.id = c.voting_anchor_id
          ORDER BY c.id DESC LIMIT 1`),
        pool.query(`SELECT epoch_no, min_fee_a, min_fee_b, key_deposit::text,
          pool_deposit::text, optimal_pool_count, min_pool_cost::text,
          monetary_expand_rate, treasury_growth_rate, protocol_major, protocol_minor
          FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`)
      ]);
      return {
        proposals: proposals.rows, dreps: dreps.rows, committee: committee.rows,
        recentVotes: recentVotes.rows, constitution: constitution.rows[0] || null,
        protocolParams: params.rows[0] || {}
      };
    });
    return c.json(data);
  } catch(e) { console.error("exp governance error:", e); return c.json({error: e.message}, 500); }
});'''
    content = content[:old_gov.start()] + new_gov + content[old_gov.end():]
    log("Fixed explorer/governance endpoint")
else:
    warn("Could not find explorer/governance endpoint")

# ============================================================
# Fix 2: Explorer Analytics - much simpler queries
# ============================================================
old_analytics = re.search(
    r'// --- Explorer: Analytics ---\napp\.get\("/explorer/analytics".*?\n\}\);',
    content, re.DOTALL
)
if old_analytics:
    new_analytics = r'''// --- Explorer: Analytics ---
app.get("/explorer/analytics", async (c) => {
  try {
    const data = await cached("exp:analytics:v2", 120, async () => {
      const [epochTrend, pots, blockVersions] = await Promise.all([
        pool.query(`SELECT e.no, e.start_time,
          (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks
          FROM epoch e ORDER BY e.no DESC LIMIT 10`),
        pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
          utxo::text, deposits_stake::text, fees::text
          FROM ada_pots ORDER BY epoch_no DESC LIMIT 10`),
        pool.query(`SELECT b.proto_major, b.proto_minor, COUNT(*) as block_count
          FROM block b WHERE b.epoch_no = (SELECT MAX(no) FROM epoch)
          GROUP BY b.proto_major, b.proto_minor ORDER BY block_count DESC`)
      ]);
      return { epochTrend: epochTrend.rows, adaPots: pots.rows, blockVersions: blockVersions.rows };
    });
    return c.json(data);
  } catch(e) { console.error("exp analytics error:", e); return c.json({error: e.message}, 500); }
});'''
    content = content[:old_analytics.start()] + new_analytics + content[old_analytics.end():]
    log("Fixed explorer/analytics endpoint")
else:
    warn("Could not find explorer/analytics endpoint")

# ============================================================
# Fix 3: Explorer Addresses - use epoch_stake for top stakers only
# ============================================================
old_addresses = re.search(
    r'// --- Explorer: Addresses.*?\napp\.get\("/explorer/addresses".*?\n\}\);',
    content, re.DOTALL
)
if old_addresses:
    new_addresses = r'''// --- Explorer: Addresses (rich list + whales) ---
app.get("/explorer/addresses", async (c) => {
  try {
    const data = await cached("exp:addresses:v2", 300, async () => {
      const [topStakers] = await Promise.all([
        pool.query(`SELECT sa.view as stake_address, es.amount::text
          FROM epoch_stake es
          JOIN stake_address sa ON sa.id = es.addr_id
          WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
          ORDER BY es.amount DESC LIMIT 100`)
      ]);
      return { topStakers: topStakers.rows };
    });
    return c.json(data);
  } catch(e) { console.error("exp addresses error:", e); return c.json({error: e.message}, 500); }
});'''
    content = content[:old_addresses.start()] + new_addresses + content[old_addresses.end():]
    log("Fixed explorer/addresses endpoint")
else:
    warn("Could not find explorer/addresses endpoint")

# Write
with open(API_FILE, "w") as f:
    f.write(content)
log("API file written")

# ============================================================
# Fix addresses frontend page (now only has topStakers, no richList)
# ============================================================
info("Updating addresses frontend page...")
addr_page = os.path.join(PROJECT, "src/app/(explorer)/explorer/addresses/page.tsx")
addr_content = r'''import { fetchAPI } from "@/lib/api";
import { fmtAda, truncHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AddressesExplorer() {
  const data: any = await fetchAPI("/explorer/addresses");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  const { topStakers = [] } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Top Stakers</h1>
      <p className="text-gray-400 text-sm">Largest stake addresses by delegated amount</p>

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 w-10">#</th>
              <th className="text-left py-2">Stake Address</th>
              <th className="text-right py-2">Staked Amount</th>
            </tr></thead>
            <tbody>{topStakers.map((s: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 text-gray-500">{i+1}</td>
                <td className="py-2 font-mono text-xs">{s.stake_address || truncHash(String(s.stake_address || ""), 14)}</td>
                <td className="py-2 text-right font-bold">{fmtAda(s.amount)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''
with open(addr_page, "w") as f:
    f.write(addr_content)
log("Addresses page updated")

# Fix analytics page (removed wealthStats and tx_count)
info("Updating analytics frontend page...")
analytics_page = os.path.join(PROJECT, "src/app/(explorer)/explorer/analytics/page.tsx")
analytics_content = r'''import { fetchAPI } from "@/lib/api";
import { fmtAda } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsExplorer() {
  const data: any = await fetchAPI("/explorer/analytics");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  const { epochTrend = [], adaPots = [], blockVersions = [] } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Network Analytics</h1>

      {/* Block Versions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Block Versions (Current Epoch)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Version</th><th className="text-right py-2">Blocks</th>
          </tr></thead>
          <tbody>{blockVersions.map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50">
              <td className="py-2">v{v.proto_major}.{v.proto_minor}</td>
              <td className="py-2 text-right">{Number(v.block_count).toLocaleString()}</td>
            </tr>))}
          </tbody>
        </table>
      </div>

      {/* Epoch Trend */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Epoch Trend</h2>
        <div className="space-y-2">
          {epochTrend.map((e: any, i: number) => {
            const max = Math.max(...epochTrend.map((x: any) => Number(x.blocks)));
            const pct = max > 0 ? (Number(e.blocks) / max) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-14 text-gray-400 font-bold">E{e.no}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div className="bg-blue-500/60 h-full rounded-full flex items-center px-2" style={{width:`${Math.max(pct,5)}%`}}>
                    <span className="text-xs whitespace-nowrap">{Number(e.blocks).toLocaleString()} blocks</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADA Pots */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">ADA Pots</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Epoch</th><th className="text-right py-2">Treasury</th>
              <th className="text-right py-2">Reserves</th><th className="text-right py-2">Rewards</th>
              <th className="text-right py-2">UTxO</th>
            </tr></thead>
            <tbody>{adaPots.map((p: any) => (
              <tr key={p.epoch_no} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2">{p.epoch_no}</td>
                <td className="py-2 text-right">{fmtAda(p.treasury)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.reserves)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.rewards)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.utxo)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''
with open(analytics_page, "w") as f:
    f.write(analytics_content)
log("Analytics page updated")

# Fix governance page - remove voter_id reference since we removed it
info("Updating governance frontend page...")
gov_page = os.path.join(PROJECT, "src/app/(explorer)/explorer/governance/page.tsx")
if os.path.isfile(gov_page):
    with open(gov_page, "r") as f:
        gc = f.read()
    # Remove voter_id column since we simplified the query
    gc = gc.replace(
        '<td className="py-2 font-mono text-xs">{truncHash(v.voter_id||"")}</td>',
        ''
    )
    gc = gc.replace(
        '<th className="text-left py-2">Voter</th>',
        ''
    )
    with open(gov_page, "w") as f:
        f.write(gc)
    log("Governance page updated")

# ============================================================
# Restart API and test
# ============================================================
info("Restarting API...")
run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
time.sleep(8)

info("Testing the 3 fixed API endpoints...")
for ep in ["explorer/governance", "explorer/analytics", "explorer/addresses"]:
    code, out, _ = run(f"curl -s http://localhost:3001/{ep} --max-time 25")
    if out and "error" not in out[:100] and "Internal" not in out:
        try:
            d = json.loads(out)
            log(f"  API /{ep} => OK (keys: {list(d.keys())})")
        except:
            warn(f"  API /{ep} => non-JSON: {out[:80]}")
    else:
        err(f"  API /{ep} => FAIL: {(out or 'timeout')[:150]}")

# Also test the previously-failing dashboard endpoints (should be cached now)
info("Testing dashboard APIs (should be cached)...")
for ep in ["dashboard/holder", "dashboard/cc", "dashboard/drep", "dashboard/chain-analyst"]:
    code, out, _ = run(f"curl -s http://localhost:3001/{ep} --max-time 25")
    if out and "error" not in out[:100] and "Internal" not in out:
        log(f"  API /{ep} => OK")
    else:
        warn(f"  API /{ep} => {(out or 'timeout')[:100]}")

# ============================================================
# Build and deploy
# ============================================================
info("Building frontend...")
dotNext = os.path.join(PROJECT, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)
code, out, errs = run("npm run build 2>&1", timeout=300)
build_out = (out + errs).strip().split("\n")
for line in build_out[-15:]:
    print(f"  {line}")
if code != 0:
    err("BUILD FAILED!"); sys.exit(1)
log("BUILD SUCCESS!")

info("Deploying...")
run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# Test all pages
info("Testing ALL pages...")
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

print(f"\n  Results: {ok} OK, {fail} failed out of {ok+fail}")
print("="*60)
if fail == 0:
    log("ALL 18 PAGES WORKING!")
else:
    warn(f"{fail} pages still need attention")
print("="*60)
