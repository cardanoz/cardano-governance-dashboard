#!/bin/bash
# Phase 4: Protocol params, Stake distribution, CC members, Pool compare, Voting simulator
set -e
cd /home/ubuntu/adatool-frontend

echo "=== Phase 4: Creating directories ==="
mkdir -p src/app/\(explorer\)/protocol
mkdir -p src/app/\(explorer\)/stake-distribution
mkdir -p src/app/\(explorer\)/committee
mkdir -p src/app/\(explorer\)/pools/compare
mkdir -p src/app/\(explorer\)/governance/simulator

echo "=== Creating Protocol Parameters page ==="
cat > "src/app/(explorer)/protocol/page.tsx" << 'PROTOEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, compactNumber } from "@/lib/format";

export const revalidate = 300;

interface ProtocolParams {
  min_fee_a: number; min_fee_b: number;
  max_block_size: number; max_tx_size: number;
  key_deposit: string; pool_deposit: string;
  min_pool_cost: string; max_block_ex_mem: string;
  max_block_ex_steps: string; max_tx_ex_mem: string;
  max_tx_ex_steps: string; collateral_percent: number;
  price_mem: number; price_step: number;
  max_val_size: number; max_collateral_inputs: number;
  protocol_major: number; protocol_minor: number;
  coins_per_utxo_size: string; epoch_no: number;
  drep_deposit: string; gov_action_deposit: string;
  drep_activity: number; gov_action_lifetime: number;
  committee_min_size: number; committee_max_term_length: number;
  dvt_motion_no_confidence: number; dvt_committee_normal: number;
  dvt_hard_fork_initiation: number; dvt_p_p_economic_group: number;
  dvt_p_p_technical_group: number; dvt_treasury_withdrawal: number;
  pvt_motion_no_confidence: number; pvt_committee_normal: number;
  pvt_hard_fork_initiation: number;
}

function ParamRow({ label, value, desc }: { label: string; value: string | number; desc?: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-800/50">
      <div>
        <span className="text-sm text-gray-300">{label}</span>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <span className="text-sm font-mono text-blue-400 ml-4 shrink-0">{value}</span>
    </div>
  );
}

export default async function ProtocolPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let params: ProtocolParams | null = null;
  try {
    const res = await fetch(`${API}/protocol-params`, { next: { revalidate: 300 } });
    if (res.ok) params = await res.json();
  } catch {}

  if (!params) return <div className="text-center py-12 text-gray-500">Failed to load protocol parameters</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Protocol Parameters</h1>
      <p className="text-sm text-gray-400">Current Cardano protocol parameters (Epoch {params.epoch_no})</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Transaction</h2>
          <ParamRow label="Min Fee A (per byte)" value={params.min_fee_a} desc="Linear fee coefficient" />
          <ParamRow label="Min Fee B (constant)" value={params.min_fee_b} desc="Constant fee component" />
          <ParamRow label="Max TX Size" value={`${(params.max_tx_size / 1024).toFixed(1)} KB`} />
          <ParamRow label="Max Block Size" value={`${(params.max_block_size / 1024).toFixed(0)} KB`} />
          <ParamRow label="Max Value Size" value={`${params.max_val_size} bytes`} />
          <ParamRow label="Coins per UTXO byte" value={`₳${lovelaceToAda(params.coins_per_utxo_size)}`} />
          <ParamRow label="Collateral %" value={`${params.collateral_percent}%`} />
          <ParamRow label="Max Collateral Inputs" value={params.max_collateral_inputs} />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Plutus Execution</h2>
          <ParamRow label="Max Block Ex. Memory" value={compactNumber(Number(params.max_block_ex_mem))} />
          <ParamRow label="Max Block Ex. Steps" value={compactNumber(Number(params.max_block_ex_steps))} />
          <ParamRow label="Max TX Ex. Memory" value={compactNumber(Number(params.max_tx_ex_mem))} />
          <ParamRow label="Max TX Ex. Steps" value={compactNumber(Number(params.max_tx_ex_steps))} />
          <ParamRow label="Price (Memory)" value={params.price_mem?.toString() || "—"} />
          <ParamRow label="Price (Steps)" value={params.price_step?.toString() || "—"} />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Staking & Pools</h2>
          <ParamRow label="Key Deposit" value={`₳${lovelaceToAda(params.key_deposit, 0)}`} desc="Stake key registration deposit" />
          <ParamRow label="Pool Deposit" value={`₳${lovelaceToAda(params.pool_deposit, 0)}`} desc="Pool registration deposit" />
          <ParamRow label="Min Pool Cost" value={`₳${lovelaceToAda(params.min_pool_cost, 0)}`} desc="Minimum fixed cost per epoch" />
          <ParamRow label="Protocol Version" value={`${params.protocol_major}.${params.protocol_minor}`} />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Governance (Conway)</h2>
          <ParamRow label="DRep Deposit" value={`₳${lovelaceToAda(params.drep_deposit || "0", 0)}`} />
          <ParamRow label="Gov Action Deposit" value={`₳${lovelaceToAda(params.gov_action_deposit || "0", 0)}`} />
          <ParamRow label="DRep Activity (epochs)" value={params.drep_activity || "—"} />
          <ParamRow label="Gov Action Lifetime" value={`${params.gov_action_lifetime || "—"} epochs`} />
          <ParamRow label="Committee Min Size" value={params.committee_min_size || "—"} />
          <ParamRow label="Committee Max Term" value={`${params.committee_max_term_length || "—"} epochs`} />
        </Card>

        <Card className="md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Voting Thresholds</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
            <ParamRow label="DRep: No Confidence" value={params.dvt_motion_no_confidence ? `${(params.dvt_motion_no_confidence * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="DRep: Committee Normal" value={params.dvt_committee_normal ? `${(params.dvt_committee_normal * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="DRep: Hard Fork" value={params.dvt_hard_fork_initiation ? `${(params.dvt_hard_fork_initiation * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="DRep: Economic Params" value={params.dvt_p_p_economic_group ? `${(params.dvt_p_p_economic_group * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="DRep: Technical Params" value={params.dvt_p_p_technical_group ? `${(params.dvt_p_p_technical_group * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="DRep: Treasury" value={params.dvt_treasury_withdrawal ? `${(params.dvt_treasury_withdrawal * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="SPO: No Confidence" value={params.pvt_motion_no_confidence ? `${(params.pvt_motion_no_confidence * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="SPO: Committee Normal" value={params.pvt_committee_normal ? `${(params.pvt_committee_normal * 100).toFixed(0)}%` : "—"} />
            <ParamRow label="SPO: Hard Fork" value={params.pvt_hard_fork_initiation ? `${(params.pvt_hard_fork_initiation * 100).toFixed(0)}%` : "—"} />
          </div>
        </Card>
      </div>
    </div>
  );
}
PROTOEOF

echo "=== Creating Stake Distribution page ==="
cat > "src/app/(explorer)/stake-distribution/page.tsx" << 'STAKEEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber } from "@/lib/format";

export const revalidate = 600;

interface StakeBucket {
  range: string; count: number; total_stake: string;
}

interface StakeStats {
  total_staked: string; total_stakers: number;
  avg_stake: string; median_stake: string;
  buckets: StakeBucket[];
}

export default async function StakeDistributionPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let data: StakeStats | null = null;
  try {
    const res = await fetch(`${API}/stake-distribution`, { next: { revalidate: 600 } });
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) return <div className="text-center py-12 text-gray-500">Failed to load stake distribution</div>;

  const maxCount = Math.max(...data.buckets.map(b => b.count), 1);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Stake Distribution</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Staked" value={`₳${compactNumber(Number(data.total_staked) / 1e6)}`} />
        <StatCard label="Delegators" value={compactNumber(data.total_stakers)} />
        <StatCard label="Average Stake" value={`₳${compactNumber(Number(data.avg_stake) / 1e6)}`} />
        <StatCard label="Median Stake" value={`₳${compactNumber(Number(data.median_stake) / 1e6)}`} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Distribution by Stake Size</h2>
        <div className="space-y-3">
          {data.buckets.map((b) => {
            const pct = ((b.count / maxCount) * 100);
            return (
              <div key={b.range}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{b.range}</span>
                  <span className="text-gray-400">
                    {compactNumber(b.count)} delegators · ₳{compactNumber(Number(b.total_stake) / 1e6)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
STAKEEOF

echo "=== Creating Constitutional Committee page ==="
cat > "src/app/(explorer)/committee/page.tsx" << 'CCEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { truncHash, compactNumber } from "@/lib/format";

export const revalidate = 300;

interface CCMember {
  cc_hash: string; has_script: boolean;
  expiration_epoch: number; status: string;
  hot_key: string | null;
  vote_count: number;
  yes_votes: number; no_votes: number; abstain_votes: number;
}

interface CCInfo {
  threshold: number; members: CCMember[];
  total_members: number; active_members: number;
}

export default async function CommitteePage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let data: CCInfo | null = null;
  try {
    const res = await fetch(`${API}/committee`, { next: { revalidate: 300 } });
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) return <div className="text-center py-12 text-gray-500">Failed to load committee data</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Constitutional Committee</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Members" value={data.total_members.toString()} />
        <StatCard label="Active Members" value={data.active_members.toString()} />
        <StatCard label="Threshold" value={`${(data.threshold * 100).toFixed(0)}%`}
          sub="Required for approval" />
        <StatCard label="Total Votes Cast"
          value={compactNumber(data.members.reduce((s, m) => s + m.vote_count, 0))} />
      </div>

      <div className="space-y-3">
        {data.members.map((m) => (
          <Card key={m.cc_hash}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === "Active" ? "bg-green-500/20 text-green-400" :
                    m.status === "Expired" ? "bg-gray-500/20 text-gray-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>{m.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.has_script ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-300"
                  }`}>{m.has_script ? "Script" : "Key"}</span>
                </div>

                <p className="font-mono text-xs text-blue-400 break-all">{m.cc_hash}</p>
                {m.hot_key && (
                  <p className="text-xs text-gray-500 mt-1">Hot Key: {truncHash(m.hot_key, 10)}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-gray-500 mb-1">Exp. Epoch {m.expiration_epoch}</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-400">Y:{m.yes_votes}</span>
                  <span className="text-red-400">N:{m.no_votes}</span>
                  <span className="text-gray-400">A:{m.abstain_votes}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{m.vote_count} total votes</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
CCEOF

echo "=== Creating Pool Comparison page ==="
cat > "src/app/(explorer)/pools/compare/page.tsx" << 'POOLCMPEOF'
"use client";
import { useState, useEffect } from "react";
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber, lovelaceToAda } from "@/lib/format";

interface PoolDetail {
  pool_hash: string; ticker: string | null; name: string | null;
  pledge: string; fixed_cost: string; margin: number;
  live_stake: string; delegator_count: number; blocks_minted: number;
  voting_power: string;
}

export default function PoolComparePage() {
  const [pools, setPools] = useState<PoolDetail[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const API = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net")
    : "https://api.adatool.net";

  const addPool = async () => {
    const id = input.trim();
    if (!id || pools.some(p => p.pool_hash === id)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/pool/${id}`);
      if (res.ok) {
        const p = await res.json();
        setPools(prev => [...prev, p]);
      }
    } catch {}
    setInput("");
    setLoading(false);
  };

  const removePool = (hash: string) => {
    setPools(prev => prev.filter(p => p.pool_hash !== hash));
  };

  const maxStake = Math.max(...pools.map(p => Number(p.live_stake)), 1);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Pool Comparison</h1>

      <Card className="mb-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPool()}
            placeholder="Enter pool ID (pool1...)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white
              placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <button onClick={addPool} disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm transition-colors">
            {loading ? "..." : "Add"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Add up to 5 pools to compare side by side</p>
      </Card>

      {pools.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="text-left py-2 px-3">Metric</th>
                {pools.map(p => (
                  <th key={p.pool_hash} className="text-right py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-blue-400">{p.ticker || "?"}</span>
                      <button onClick={() => removePool(p.pool_hash)}
                        className="text-gray-600 hover:text-red-400 ml-1">×</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Name</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right text-white">{p.name || "—"}</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Live Stake</td>
                {pools.map(p => (
                  <td key={p.pool_hash} className="py-2 px-3 text-right">
                    <div className="text-green-400">₳{compactNumber(Number(p.live_stake) / 1e6)}</div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                      <div className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${(Number(p.live_stake) / maxStake) * 100}%` }} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Delegators</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right">{p.delegator_count.toLocaleString()}</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Blocks Minted</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right font-mono">{p.blocks_minted.toLocaleString()}</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Margin</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right">{(p.margin * 100).toFixed(1)}%</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Fixed Cost</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right">₳{lovelaceToAda(p.fixed_cost, 0)}</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Pledge</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right">₳{compactNumber(Number(p.pledge) / 1e6)}</td>)}
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-2 px-3 text-gray-400">Saturation</td>
                {pools.map(p => {
                  const sat = Number(p.live_stake) > 0
                    ? ((Number(p.live_stake) / 68_000_000_000_000) * 100).toFixed(1)
                    : "0";
                  return <td key={p.pool_hash} className="py-2 px-3 text-right">{sat}%</td>;
                })}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Voting Power</td>
                {pools.map(p => <td key={p.pool_hash} className="py-2 px-3 text-right">₳{compactNumber(Number(p.voting_power || 0) / 1e6)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {pools.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Add pool IDs above to start comparing
        </div>
      )}
    </div>
  );
}
POOLCMPEOF

echo "=== Creating Governance Voting Simulator page ==="
cat > "src/app/(explorer)/governance/simulator/page.tsx" << 'SIMEOF'
"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface SimResult {
  action_type: string;
  drep_threshold: number; spo_threshold: number; cc_threshold: number;
  drep_yes_pct: number; spo_yes_pct: number;
  drep_pass: boolean; spo_pass: boolean; cc_pass: boolean;
  overall_pass: boolean;
}

const ACTION_TYPES = [
  { value: "NoConfidence", label: "Motion of No Confidence", drep: 0.67, spo: 0.51, cc: false },
  { value: "UpdateCommittee", label: "Update Committee", drep: 0.67, spo: 0.51, cc: false },
  { value: "NewConstitution", label: "New Constitution", drep: 0.75, spo: 0, cc: true },
  { value: "HardForkInitiation", label: "Hard Fork Initiation", drep: 0.60, spo: 0.51, cc: true },
  { value: "ParameterChange", label: "Protocol Parameter Change", drep: 0.67, spo: 0, cc: true },
  { value: "TreasuryWithdrawals", label: "Treasury Withdrawal", drep: 0.67, spo: 0, cc: true },
  { value: "InfoAction", label: "Info Action", drep: 1.00, spo: 1.00, cc: false },
];

export default function VotingSimulator() {
  const [actionType, setActionType] = useState("ParameterChange");
  const [drepYes, setDrepYes] = useState(60);
  const [spoYes, setSpoYes] = useState(55);
  const [ccApprove, setCcApprove] = useState(true);

  const config = ACTION_TYPES.find(a => a.value === actionType)!;

  const drepPass = drepYes >= (config.drep * 100);
  const spoPass = config.spo > 0 ? spoYes >= (config.spo * 100) : true;
  const ccPass = config.cc ? ccApprove : true;
  const overallPass = drepPass && spoPass && ccPass;

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Governance Voting Simulator</h1>
      <p className="text-sm text-gray-400 mb-4">
        Simulate voting outcomes for different governance action types
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Parameters</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                DRep Yes Vote %: <span className="text-blue-400">{drepYes}%</span>
                <span className="text-gray-600 ml-2">(threshold: {(config.drep * 100).toFixed(0)}%)</span>
              </label>
              <input type="range" min={0} max={100} value={drepYes}
                onChange={(e) => setDrepYes(Number(e.target.value))}
                className="w-full accent-blue-500" />
            </div>

            {config.spo > 0 && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  SPO Yes Vote %: <span className="text-blue-400">{spoYes}%</span>
                  <span className="text-gray-600 ml-2">(threshold: {(config.spo * 100).toFixed(0)}%)</span>
                </label>
                <input type="range" min={0} max={100} value={spoYes}
                  onChange={(e) => setSpoYes(Number(e.target.value))}
                  className="w-full accent-blue-500" />
              </div>
            )}

            {config.cc && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cc-approve" checked={ccApprove}
                  onChange={(e) => setCcApprove(e.target.checked)}
                  className="accent-blue-500 w-4 h-4" />
                <label htmlFor="cc-approve" className="text-sm text-gray-300">
                  Constitutional Committee Approves
                </label>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Result</h2>

          <div className={`text-center py-6 rounded-lg mb-4 ${overallPass ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <span className={`text-3xl font-bold ${overallPass ? "text-green-400" : "text-red-400"}`}>
              {overallPass ? "PASSES" : "FAILS"}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">DRep Vote ({drepYes}% / {(config.drep * 100).toFixed(0)}%)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${drepPass ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {drepPass ? "Pass" : "Fail"}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 relative">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${drepYes}%` }} />
              <div className="absolute top-0 h-3 w-0.5 bg-yellow-500" style={{ left: `${config.drep * 100}%` }} />
            </div>

            {config.spo > 0 && (
              <>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-400">SPO Vote ({spoYes}% / {(config.spo * 100).toFixed(0)}%)</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${spoPass ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {spoPass ? "Pass" : "Fail"}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 relative">
                  <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${spoYes}%` }} />
                  <div className="absolute top-0 h-3 w-0.5 bg-yellow-500" style={{ left: `${config.spo * 100}%` }} />
                </div>
              </>
            )}

            {config.cc && (
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-400">Committee</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ccPass ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {ccApprove ? "Approved" : "Rejected"}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
SIMEOF

echo "=== Updating Header with Phase 4 nav ==="
cat > src/components/layout/Header.tsx << 'HEADEREOF'
import Link from "next/link";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/blocks", label: "Blocks" },
  { href: "/txs", label: "TXs" },
  { href: "/epochs", label: "Epochs" },
  { href: "/pools", label: "Pools" },
  { href: "/assets", label: "Assets" },
  { href: "/governance", label: "Governance" },
  { href: "/dreps", label: "DReps" },
  { href: "/committee", label: "Committee" },
  { href: "/protocol", label: "Params" },
  { href: "/whales", label: "Whales" },
  { href: "/richlist", label: "Rich List" },
  { href: "/charts", label: "Charts" },
  { href: "/stake-distribution", label: "Stake" },
  { href: "/wallet", label: "Wallet" },
];

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white tracking-tight shrink-0">
          ADA<span className="text-blue-500">tool</span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto ml-4 scrollbar-hide">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
HEADEREOF

echo ""
echo "=== Phase 4 frontend complete ==="
echo "Run: npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "Then: sudo systemctl restart adatool-frontend"
