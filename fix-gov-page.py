#!/usr/bin/env python3
"""Fix /explorer/governance 500 error - rewrite the page cleanly."""
import os, subprocess, time, shutil

PROJECT = "/home/ubuntu/adatool-frontend"
G = "\033[32m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")

def run(cmd, cwd=None, timeout=180):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

# Rewrite governance explorer page
page = os.path.join(PROJECT, "src/app/(explorer)/explorer/governance/page.tsx")
content = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo, lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GovernanceExplorer() {
  const data: any = await fetchAPI("/explorer/governance");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  const { proposals = [], dreps = [], committee = [], recentVotes = [], constitution, protocolParams: pp } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Governance Explorer</h1>

      {constitution && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Constitution</h2>
          <div className="text-sm">
            {constitution.url && <p><span className="text-gray-400">URL: </span><a href={String(constitution.url)} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{String(constitution.url)}</a></p>}
            {constitution.script_hash && <p className="mt-1"><span className="text-gray-400">Script: </span><span className="font-mono text-xs">{String(constitution.script_hash)}</span></p>}
          </div>
        </div>
      )}

      {pp && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Protocol Parameters (Epoch {pp.epoch_no})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-400">Key Deposit</span><p>{lovelaceToAda(pp.key_deposit || 0)} ADA</p></div>
            <div><span className="text-gray-400">Pool Deposit</span><p>{lovelaceToAda(pp.pool_deposit || 0)} ADA</p></div>
            <div><span className="text-gray-400">Min Pool Cost</span><p>{lovelaceToAda(pp.min_pool_cost || 0)} ADA</p></div>
            <div><span className="text-gray-400">Optimal Pools</span><p>{pp.optimal_pool_count}</p></div>
            <div><span className="text-gray-400">Monetary Expansion</span><p>{(Number(pp.monetary_expand_rate || 0) * 100).toFixed(3)}%</p></div>
            <div><span className="text-gray-400">Treasury Growth</span><p>{(Number(pp.treasury_growth_rate || 0) * 100).toFixed(1)}%</p></div>
            <div><span className="text-gray-400">Protocol</span><p>v{pp.protocol_major}.{pp.protocol_minor}</p></div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Committee ({committee.length} members)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Credential</th><th className="text-left py-2">Type</th><th className="text-right py-2">Expires</th>
            </tr></thead>
            <tbody>{committee.map((m: any, i: number) => (
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
        <h2 className="text-lg font-semibold mb-4">Governance Proposals ({proposals.length})</h2>
        <div className="space-y-3">
          {proposals.map((p: any, i: number) => {
            const status = p.enacted_epoch ? "Enacted" : p.ratified_epoch ? "Ratified" : p.dropped_epoch ? "Dropped" : p.expired_epoch ? "Expired" : "Active";
            const sc = status === "Enacted" ? "bg-green-600/30 text-green-300" : status === "Active" ? "bg-yellow-600/30 text-yellow-300" : status === "Ratified" ? "bg-blue-600/30 text-blue-300" : "bg-red-600/30 text-red-300";
            return (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${sc}`}>{status}</span>
                    <span className="bg-gray-600/50 text-gray-300 px-2 py-0.5 rounded text-xs">{p.type}</span>
                    <span className="font-mono text-xs text-gray-400">{p.tx_hash ? truncHash(String(p.tx_hash)) : ""}#{p.index}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    <span>{p.vote_count} votes</span>
                    <span className="ml-2">{p.time ? timeAgo(String(p.time)) : ""}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {proposals.length === 0 && <p className="text-gray-500 text-sm">No proposals found</p>}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">DReps ({dreps.length})</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">#</th><th className="text-left py-2">DRep</th>
            <th className="text-left py-2">Type</th><th className="text-right py-2">Delegations</th>
          </tr></thead>
          <tbody>{dreps.map((d: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-gray-400">{i + 1}</td>
              <td className="py-2 font-mono text-xs">{d.view || (d.drep_hash ? truncHash(String(d.drep_hash)) : "\u2014")}</td>
              <td className="py-2">{d.has_script ? <span className="text-yellow-400 text-xs">Script</span> : <span className="text-gray-400 text-xs">Key</span>}</td>
              <td className="py-2 text-right font-bold">{Number(d.delegations || 0).toLocaleString()}</td>
            </tr>))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Votes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Proposal Type</th>
            <th className="text-left py-2">Role</th><th className="text-left py-2">Vote</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{recentVotes.map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-xs">{v.proposal_type}</td>
              <td className="py-2"><span className="px-1 py-0.5 rounded text-xs bg-gray-600/50">{v.voter_role}</span></td>
              <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.vote === "Yes" ? "bg-green-600/30 text-green-300" : v.vote === "No" ? "bg-red-600/30 text-red-300" : "bg-gray-600/30"}`}>{v.vote}</span></td>
              <td className="py-2 text-right text-gray-400 text-xs">{v.time ? timeAgo(String(v.time)) : ""}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''

with open(page, "w") as f:
    f.write(content)
log("Governance page rewritten")

# Build
print("Building...")
dotNext = os.path.join(PROJECT, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)
code, out, errs = run("npm run build 2>&1", timeout=300)
if code != 0:
    print("BUILD FAILED!")
    for line in (out+errs).strip().split("\n")[-20:]:
        print(f"  {line}")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# Test
_, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/explorer/governance --max-time 25")
status = out.strip().strip("'")
if status.startswith("2"):
    log(f"/explorer/governance => {status}")
else:
    print(f"WARN: /explorer/governance => {status}")

# Quick test all
print("\nFull test:")
pages = ["dashboard","dashboard/holder","dashboard/spo","dashboard/cc","dashboard/drep",
         "dashboard/governance","dashboard/chain","dashboard/portfolio","dashboard/developer",
         "explorer","explorer/chain","explorer/staking","explorer/governance",
         "explorer/tokens","explorer/analytics","explorer/addresses","live","search"]
ok=fail=0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    s = out.strip().strip("'")
    if s.startswith("2"): log(f"  /{p} => {s}"); ok+=1
    else: print(f"  WARN /{p} => {s}"); fail+=1
print(f"\n  {ok}/18 OK")
