#!/bin/bash
set -e

cd /home/ubuntu/adatool-frontend

# Create base directories
mkdir -p src/app/\(explorer\)/{votes,drep-delegations,constitution,treasury,tx-metadata,contract-txs,rewards-withdrawals}
mkdir -p src/app/\(explorer\)/{delegations,pools/new,pools/retired,pool-updates,certificates,rewards-checker}
mkdir -p src/app/\(explorer\)/analytics/{pots,treasury-projection,top-addresses,top-stakers,wealth,block-versions,genesis,tx-charts}

echo "Creating Phase 5 pages..."

# ============================================================================
# PHASE 5: VOTES PAGE
# ============================================================================
cat > "src/app/(explorer)/votes/page.tsx" << 'VOTESEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Vote {
  id: string;
  voter_role: string;
  vote: "Yes" | "No" | "Abstain";
  action_type: string;
  voter_id: string;
  action_title: string;
  time: string;
}

export default async function VotesPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let votes: Vote[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/votes`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch votes");
    votes = await response.json();
  } catch (err) {
    error = "Failed to load votes data";
  }

  const getVoteColor = (vote: string) => {
    if (vote === "Yes") return "bg-green-900 text-green-200";
    if (vote === "No") return "bg-red-900 text-red-200";
    if (vote === "Abstain") return "bg-yellow-900 text-yellow-200";
    return "bg-gray-700 text-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Governance Votes</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {votes.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {votes.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Voter Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Vote</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Action Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Voter ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Action Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((vote) => (
                  <tr key={vote.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">{vote.voter_role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getVoteColor(vote.vote)}`}>
                        {vote.vote}
                      </span>
                    </td>
                    <td className="px-4 py-3">{vote.action_type}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dreps/${vote.voter_id}`} className="text-blue-400 hover:text-blue-300">
                        {vote.voter_id.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{vote.action_title}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(vote.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
VOTESEOF

# ============================================================================
# PHASE 5: DREP DELEGATIONS PAGE
# ============================================================================
cat > "src/app/(explorer)/drep-delegations/page.tsx" << 'DREPDELEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface DRepDelegation {
  id: string;
  delegator_address: string;
  drep_hash: string;
  tx_hash: string;
  time: string;
}

export default async function DRepDelegationsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let delegations: DRepDelegation[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/drep-delegations`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch delegations");
    delegations = await response.json();
  } catch (err) {
    error = "Failed to load DRep delegations data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">DRep Delegations</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {delegations.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {delegations.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Delegator Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">DRep Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {delegations.map((del) => (
                  <tr key={del.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/address/${del.delegator_address}`} className="text-blue-400 hover:text-blue-300">
                        {del.delegator_address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dreps/${del.drep_hash}`} className="text-blue-400 hover:text-blue-300">
                        {del.drep_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tx/${del.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {del.tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(del.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
DREPDELEOF

# ============================================================================
# PHASE 5: CONSTITUTION PAGE
# ============================================================================
cat > "src/app/(explorer)/constitution/page.tsx" << 'CONSTEOF'
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Constitution {
  script_hash: string;
  anchor_url: string;
  anchor_hash: string;
}

export default async function ConstitutionPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let constitution: Constitution | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/constitution`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch constitution");
    constitution = await response.json();
  } catch (err) {
    error = "Failed to load constitution data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Cardano Constitution</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {!constitution && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {constitution && (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-2">Script Hash</h2>
              <p className="text-gray-100 font-mono break-all">{constitution.script_hash}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-2">Anchor URL</h2>
              <a
                href={constitution.anchor_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 break-all"
              >
                {constitution.anchor_url}
              </a>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-2">Anchor Hash</h2>
              <p className="text-gray-100 font-mono break-all">{constitution.anchor_hash}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
CONSTEOF

# ============================================================================
# PHASE 5: TREASURY PAGE
# ============================================================================
cat > "src/app/(explorer)/treasury/page.tsx" << 'TREASEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TreasuryWithdrawal {
  id: string;
  amount: number;
  action_tx_hash: string;
  epoch_no: number;
  time: string;
}

export default async function TreasuryPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let withdrawals: TreasuryWithdrawal[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/treasury-withdrawals`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch treasury withdrawals");
    withdrawals = await response.json();
  } catch (err) {
    error = "Failed to load treasury data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Treasury Withdrawals</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {withdrawals.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {withdrawals.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Amount (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(withdrawal.amount)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/tx/${withdrawal.action_tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {withdrawal.action_tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">{withdrawal.epoch_no}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(withdrawal.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
TREASEOF

# ============================================================================
# PHASE 5: TRANSACTION METADATA PAGE
# ============================================================================
cat > "src/app/(explorer)/tx-metadata/page.tsx" << 'TXMETAEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface TxMetadata {
  id: string;
  tx_hash: string;
  key: string;
  json_value: string;
  time: string;
}

export default async function TxMetadataPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let metadata: TxMetadata[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/tx-metadata`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch metadata");
    metadata = await response.json();
  } catch (err) {
    error = "Failed to load metadata data";
  }

  const truncateJson = (json: string, maxLength: number = 200) => {
    if (json.length > maxLength) {
      return json.slice(0, maxLength) + "...";
    }
    return json;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transaction Metadata</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {metadata.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {metadata.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Key</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">JSON Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {metadata.map((meta) => (
                  <tr key={meta.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/tx/${meta.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {meta.tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{meta.key}</td>
                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{truncateJson(meta.json_value)}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(meta.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
TXMETAEOF

# ============================================================================
# PHASE 5: CONTRACT TRANSACTIONS PAGE
# ============================================================================
cat > "src/app/(explorer)/contract-txs/page.tsx" << 'CONTRACTEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, compactNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

interface ContractTx {
  id: string;
  tx_hash: string;
  fee: number;
  script_size: number;
  redeemer_count: number;
  redeemer_purposes: string;
  block_time: string;
}

export default async function ContractTxsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let transactions: ContractTx[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/contract-txs`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch contract txs");
    transactions = await response.json();
  } catch (err) {
    error = "Failed to load contract transaction data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Smart Contract Transactions</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {transactions.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {transactions.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Fee (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Script Size</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Redeemers</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Purposes</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/tx/${tx.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {tx.tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(tx.fee)}</td>
                    <td className="px-4 py-3">{compactNumber(tx.script_size)}</td>
                    <td className="px-4 py-3">{tx.redeemer_count}</td>
                    <td className="px-4 py-3 text-xs">{tx.redeemer_purposes}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(tx.block_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
CONTRACTEOF

# ============================================================================
# PHASE 5: REWARDS WITHDRAWALS PAGE
# ============================================================================
cat > "src/app/(explorer)/rewards-withdrawals/page.tsx" << 'REWARDSEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface RewardsWithdrawal {
  id: string;
  stake_address: string;
  amount: number;
  tx_hash: string;
  block_time: string;
}

export default async function RewardsWithdrawalsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let withdrawals: RewardsWithdrawal[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/rewards-withdrawals`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch withdrawals");
    withdrawals = await response.json();
  } catch (err) {
    error = "Failed to load rewards withdrawal data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Rewards Withdrawals</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {withdrawals.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {withdrawals.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Stake Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Amount (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/address/${withdrawal.stake_address}`} className="text-blue-400 hover:text-blue-300">
                        {withdrawal.stake_address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(withdrawal.amount)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/tx/${withdrawal.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {withdrawal.tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(withdrawal.block_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
REWARDSEOF

echo "Creating Phase 6 pages..."

# ============================================================================
# PHASE 6: DELEGATIONS PAGE
# ============================================================================
cat > "src/app/(explorer)/delegations/page.tsx" << 'DELEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Delegation {
  id: string;
  stake_address: string;
  pool_hash: string;
  tx_hash: string;
  time: string;
}

export default async function DelegationsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let delegations: Delegation[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/delegations/live`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch delegations");
    delegations = await response.json();
  } catch (err) {
    error = "Failed to load delegations data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Live Delegations</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {delegations.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {delegations.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Stake Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pool Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {delegations.map((delegation) => (
                  <tr key={delegation.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/address/${delegation.stake_address}`} className="text-blue-400 hover:text-blue-300">
                        {delegation.stake_address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/pool/${delegation.pool_hash}`} className="text-blue-400 hover:text-blue-300">
                        {delegation.pool_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tx/${delegation.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                        {delegation.tx_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(delegation.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
DELEOF

# ============================================================================
# PHASE 6: NEW POOLS PAGE
# ============================================================================
cat > "src/app/(explorer)/pools/new/page.tsx" << 'NEWPOOLEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Pool {
  id: string;
  pool_hash: string;
  ticker: string;
  name: string;
  time: string;
}

export default async function NewPoolsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let pools: Pool[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/pools/new`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch new pools");
    pools = await response.json();
  } catch (err) {
    error = "Failed to load new pools data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Newly Registered Pools</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {pools.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {pools.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pool Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Ticker</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <tr key={pool.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/pool/${pool.pool_hash}`} className="text-blue-400 hover:text-blue-300">
                        {pool.pool_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{pool.ticker}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{pool.name}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(pool.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
NEWPOOLEOF

# ============================================================================
# PHASE 6: RETIRED POOLS PAGE
# ============================================================================
cat > "src/app/(explorer)/pools/retired/page.tsx" << 'RETIREDPOOLEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface RetiredPool {
  id: string;
  pool_hash: string;
  ticker: string;
  name: string;
  retiring_epoch: number;
  announced_time: string;
}

export default async function RetiredPoolsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let pools: RetiredPool[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/pools/retired`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch retired pools");
    pools = await response.json();
  } catch (err) {
    error = "Failed to load retired pools data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Retired Pools</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {pools.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {pools.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pool Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Ticker</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Retiring Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Announced</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <tr key={pool.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/pool/${pool.pool_hash}`} className="text-blue-400 hover:text-blue-300">
                        {pool.pool_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{pool.ticker}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{pool.name}</td>
                    <td className="px-4 py-3">{pool.retiring_epoch}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(pool.announced_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
RETIREDPOOLEOF

# ============================================================================
# PHASE 6: POOL UPDATES PAGE
# ============================================================================
cat > "src/app/(explorer)/pool-updates/page.tsx" << 'POOLUPDATEEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PoolUpdate {
  id: string;
  pool_hash: string;
  ticker: string;
  pledge: number;
  margin: number;
  fixed_cost: number;
  time: string;
}

export default async function PoolUpdatesPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let updates: PoolUpdate[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/pool-updates`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch pool updates");
    updates = await response.json();
  } catch (err) {
    error = "Failed to load pool updates data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Pool Parameter Updates</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {updates.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {updates.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pool Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Ticker</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pledge (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Margin (%)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Fixed Cost (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((update) => (
                  <tr key={update.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/pool/${update.pool_hash}`} className="text-blue-400 hover:text-blue-300">
                        {update.pool_hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{update.ticker}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(update.pledge)}</td>
                    <td className="px-4 py-3">{(update.margin * 100).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(update.fixed_cost)}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(update.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
POOLUPDATEEOF

# ============================================================================
# PHASE 6: CERTIFICATES PAGE
# ============================================================================
cat > "src/app/(explorer)/certificates/page.tsx" << 'CERTEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Certificate {
  id: string;
  cert_type: string;
  stake_address?: string;
  pool_hash?: string;
  tx_hash: string;
  time: string;
}

export default async function CertificatesPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let certificates: Certificate[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/certificates`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch certificates");
    certificates = await response.json();
  } catch (err) {
    error = "Failed to load certificates data";
  }

  const getCertTypeColor = (type: string) => {
    if (type.includes("stake")) return "bg-blue-900 text-blue-200";
    if (type.includes("pool")) return "bg-purple-900 text-purple-200";
    if (type.includes("retire")) return "bg-red-900 text-red-200";
    return "bg-gray-700 text-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">On-chain Certificates</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {certificates.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {certificates.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Address / Pool</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">TX Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => {
                  const isPool = !!cert.pool_hash;
                  const displayAddress = isPool ? cert.pool_hash : cert.stake_address;
                  const linkHref = isPool ? `/pool/${cert.pool_hash}` : `/address/${cert.stake_address}`;

                  return (
                    <tr key={cert.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCertTypeColor(cert.cert_type)}`}>
                          {cert.cert_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {displayAddress && (
                          <Link href={linkHref} className="text-blue-400 hover:text-blue-300">
                            {displayAddress.slice(0, 16)}...
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tx/${cert.tx_hash}`} className="text-blue-400 hover:text-blue-300">
                          {cert.tx_hash.slice(0, 16)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{new Date(cert.time).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
CERTEOF

# ============================================================================
# PHASE 6: REWARDS CHECKER PAGE (CLIENT COMPONENT)
# ============================================================================
cat > "src/app/(explorer)/rewards-checker/page.tsx" << 'REWARDSCHECKEREOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

interface RewardData {
  type: string;
  amount: number;
  earned_epoch: number;
  spendable_epoch: number;
  pool_hash?: string;
}

export default function RewardsCheckerPage() {
  const [address, setAddress] = useState("");
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRewards([]);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
      const response = await fetch(`${API}/rewards-check/${address}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Address not found or no rewards data");
      }

      const data = await response.json();
      setRewards(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rewards data");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Rewards Checker</h1>

        <Card className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enter Stake Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="stake1u..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !address}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition"
            >
              {loading ? "Loading..." : "Check Rewards"}
            </button>
          </form>
        </Card>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {searched && rewards.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No rewards found for this address
          </Card>
        )}

        {rewards.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Amount (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Earned Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Spendable Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Pool</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">{reward.type}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(reward.amount)}</td>
                    <td className="px-4 py-3">{reward.earned_epoch}</td>
                    <td className="px-4 py-3">{reward.spendable_epoch}</td>
                    <td className="px-4 py-3">
                      {reward.pool_hash ? (
                        <Link href={`/pool/${reward.pool_hash}`} className="text-blue-400 hover:text-blue-300">
                          {reward.pool_hash.slice(0, 16)}...
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
REWARDSCHECKEREOF

echo "Creating Phase 7 pages..."

# ============================================================================
# PHASE 7: ADA POTS PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/pots/page.tsx" << 'POTSEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Pot {
  epoch_no: number;
  treasury: number;
  reserves: number;
  utxo: number;
  rewards: number;
}

export default async function PotsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let pots: Pot[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/pots`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch pots");
    pots = await response.json();
  } catch (err) {
    error = "Failed to load ADA pots data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">ADA Pots History</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {pots.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {pots.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Treasury (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Reserves (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">UTXO (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Rewards (ADA)</th>
                </tr>
              </thead>
              <tbody>
                {pots.map((pot) => (
                  <tr key={pot.epoch_no} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-semibold">{pot.epoch_no}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(pot.treasury)}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(pot.reserves)}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(pot.utxo)}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(pot.rewards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
POTSEOF

# ============================================================================
# PHASE 7: TREASURY PROJECTION PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/treasury-projection/page.tsx" << 'TREASUREEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TreasuryData {
  epoch_no: number;
  amount: number;
  is_projection: boolean;
}

export default async function TreasuryProjectionPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let data: TreasuryData[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/treasury-projection`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch projection");
    data = await response.json();
  } catch (err) {
    error = "Failed to load treasury projection data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Treasury Projection</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {data.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {data.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Epoch</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Amount (ADA)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.epoch_no}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                      row.is_projection ? "border-l-2 border-l-yellow-600 italic" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{row.epoch_no}</td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
TREASUREEOF

# ============================================================================
# PHASE 7: TOP ADDRESSES PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/top-addresses/page.tsx" << 'TOPADDRESSEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TopAddress {
  rank: number;
  address: string;
  stake_address?: string;
  total_value: number;
  utxo_count: number;
}

export default async function TopAddressesPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let addresses: TopAddress[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/top-addresses`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch addresses");
    addresses = await response.json();
  } catch (err) {
    error = "Failed to load top addresses data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Top Addresses by Balance</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {addresses.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {addresses.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Stake Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Total Value (ADA)</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">UTXO Count</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((addr) => (
                  <tr key={addr.rank} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-bold text-blue-400">{addr.rank}</td>
                    <td className="px-4 py-3">
                      <Link href={`/address/${addr.address}`} className="text-blue-400 hover:text-blue-300">
                        {addr.address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {addr.stake_address ? addr.stake_address.slice(0, 16) + "..." : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(addr.total_value)}</td>
                    <td className="px-4 py-3">{addr.utxo_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
TOPADDRESSEOF

# ============================================================================
# PHASE 7: TOP STAKERS PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/top-stakers/page.tsx" << 'TOPSTAKERSEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TopStaker {
  rank: number;
  stake_address: string;
  stake_amount: number;
}

export default async function TopStakersPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let stakers: TopStaker[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/top-stakers`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch stakers");
    stakers = await response.json();
  } catch (err) {
    error = "Failed to load top stakers data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Top Staking Accounts</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {stakers.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {stakers.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Stake Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Stake Amount (ADA)</th>
                </tr>
              </thead>
              <tbody>
                {stakers.map((staker) => (
                  <tr key={staker.rank} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-bold text-blue-400">{staker.rank}</td>
                    <td className="px-4 py-3">
                      <Link href={`/address/${staker.stake_address}`} className="text-blue-400 hover:text-blue-300">
                        {staker.stake_address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(staker.stake_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
TOPSTAKERSEOF

# ============================================================================
# PHASE 7: WEALTH DISTRIBUTION PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/wealth/page.tsx" << 'WEALTHEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, compactNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

interface WealthBucket {
  epoch_no: number;
  range_min: number;
  range_max: number;
  count: number;
  total_stake: number;
}

export default async function WealthPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let buckets: WealthBucket[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/wealth-composition`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch wealth data");
    buckets = await response.json();
  } catch (err) {
    error = "Failed to load wealth distribution data";
  }

  const groupedByEpoch = buckets.reduce((acc, bucket) => {
    if (!acc[bucket.epoch_no]) {
      acc[bucket.epoch_no] = [];
    }
    acc[bucket.epoch_no].push(bucket);
    return acc;
  }, {} as Record<number, WealthBucket[]>);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Wealth Distribution</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {Object.keys(groupedByEpoch).length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {Object.entries(groupedByEpoch).map(([epoch, epochBuckets]) => (
          <div key={epoch} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-300">Epoch {epoch}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {epochBuckets.map((bucket, idx) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">
                      {lovelaceToAda(bucket.range_min)} - {lovelaceToAda(bucket.range_max)} ADA
                    </p>
                    <p className="text-lg font-semibold">{compactNumber(bucket.count)} accounts</p>
                    <p className="text-sm text-gray-400">
                      Total Stake: {lovelaceToAda(bucket.total_stake)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
WEALTHEOF

# ============================================================================
# PHASE 7: BLOCK VERSIONS PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/block-versions/page.tsx" << 'BLOCKVERSEOF'
import { Card } from "@/components/ui/Card";
import { compactNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

interface BlockVersion {
  major: number;
  minor: number;
  block_count: number;
  percentage: number;
}

export default async function BlockVersionsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let versions: BlockVersion[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/block-versions`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch versions");
    versions = await response.json();
  } catch (err) {
    error = "Failed to load block versions data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Block Protocol Versions</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {versions.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {versions.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Version</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Block Count</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Percentage</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Bar</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono font-semibold">{version.major}.{version.minor}</td>
                    <td className="px-4 py-3">{compactNumber(version.block_count)}</td>
                    <td className="px-4 py-3">{version.percentage.toFixed(2)}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-800 rounded h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: \`\${version.percentage}%\` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
BLOCKVERSEOF

# ============================================================================
# PHASE 7: GENESIS ADDRESSES PAGE
# ============================================================================
cat > "src/app/(explorer)/analytics/genesis/page.tsx" << 'GENESISEOF'
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface GenesisAddress {
  rank: number;
  address: string;
  total_value: number;
}

export default async function GenesisPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let addresses: GenesisAddress[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${API}/genesis-addresses`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch genesis addresses");
    addresses = await response.json();
  } catch (err) {
    error = "Failed to load genesis addresses data";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Genesis Addresses</h1>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {addresses.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {addresses.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-400">Total Value (ADA)</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((addr) => (
                  <tr key={addr.rank} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-bold text-blue-400">{addr.rank}</td>
                    <td className="px-4 py-3">
                      <Link href={`/address/${addr.address}`} className="text-blue-400 hover:text-blue-300">
                        {addr.address.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{lovelaceToAda(addr.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
GENESISEOF

# ============================================================================
# PHASE 7: TRANSACTION CHARTS PAGE (CLIENT COMPONENT)
# ============================================================================
cat > "src/app/(explorer)/analytics/tx-charts/page.tsx" << 'TXCHARTSEOF'
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, compactNumber } from "@/lib/format";

interface ChartData {
  label: string;
  value: number;
}

export default function TxChartsPage() {
  const [metric, setMetric] = useState("daily-count");
  const [days, setDays] = useState(7);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [metric, days]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
      const response = await fetch(`${API}/tx-charts?metric=${metric}&days=${days}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch chart data");
      }

      const data = await response.json();
      setChartData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  const formatValue = (value: number) => {
    if (metric.includes("fees")) return lovelaceToAda(value);
    if (metric.includes("volume")) return lovelaceToAda(value);
    return compactNumber(value);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transaction Analytics</h1>

        <Card className="p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Metric</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
              >
                <option value="daily-count">Daily TX Count</option>
                <option value="daily-fees">Daily Fees</option>
                <option value="daily-volume">Daily Volume</option>
                <option value="avg-tx-size">Avg TX Size</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Period (Days)</label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="bg-red-900/20 border-red-800 p-4 mb-6">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 text-center text-gray-400">
            Loading chart data...
          </Card>
        )}

        {!loading && chartData.length === 0 && !error && (
          <Card className="p-4 text-center text-gray-400">
            No data available
          </Card>
        )}

        {!loading && chartData.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              {chartData.map((data, idx) => {
                const percentage = (data.value / maxValue) * 100;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{data.label}</span>
                      <span className="font-mono">{formatValue(data.value)}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: \`\${percentage}%\` }}
                      >
                        {percentage > 20 && (
                          <span className="text-xs font-semibold text-white">{percentage.toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
TXCHARTSEOF

echo "Creating new Navigation Header component..."

# ============================================================================
# NEW HEADER COMPONENT WITH DROPDOWN NAVIGATION
# ============================================================================
# Write to same location as existing Header so layout.tsx import works
cat > "src/components/layout/Header.tsx" << 'HEADEREOF'
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const menuItems = [
  {
    label: "Blockchain",
    items: [
      { href: "/blocks", label: "Blocks" },
      { href: "/txs", label: "Transactions" },
      { href: "/epochs", label: "Epochs" },
      { href: "/assets", label: "Assets" },
      { href: "/contract-txs", label: "Contract TXs" },
      { href: "/tx-metadata", label: "TX Metadata" },
    ]
  },
  {
    label: "Staking",
    items: [
      { href: "/pools", label: "Stake Pools" },
      { href: "/pools/new", label: "New Pools" },
      { href: "/pools/retired", label: "Retired Pools" },
      { href: "/delegations", label: "Live Delegations" },
      { href: "/pool-updates", label: "Pool Updates" },
      { href: "/rewards-withdrawals", label: "Rewards Withdrawals" },
      { href: "/rewards-checker", label: "Rewards Checker" },
      { href: "/certificates", label: "Certificates" },
    ]
  },
  {
    label: "Governance",
    items: [
      { href: "/governance", label: "Actions" },
      { href: "/dreps", label: "DReps" },
      { href: "/committee", label: "Committee" },
      { href: "/votes", label: "Votes" },
      { href: "/drep-delegations", label: "DRep Delegations" },
      { href: "/constitution", label: "Constitution" },
      { href: "/treasury", label: "Treasury" },
      { href: "/governance/simulator", label: "Voting Simulator" },
      { href: "/protocol", label: "Parameters" },
    ]
  },
  {
    label: "Analytics",
    items: [
      { href: "/charts", label: "Charts" },
      { href: "/analytics/pots", label: "ADA Pots" },
      { href: "/analytics/treasury-projection", label: "Treasury Projection" },
      { href: "/analytics/top-addresses", label: "Top Addresses" },
      { href: "/analytics/top-stakers", label: "Top Stakers" },
      { href: "/analytics/wealth", label: "Wealth Distribution" },
      { href: "/analytics/block-versions", label: "Block Versions" },
      { href: "/analytics/genesis", label: "Genesis Addresses" },
      { href: "/analytics/tx-charts", label: "TX Analytics" },
      { href: "/stake-distribution", label: "Stake Distribution" },
      { href: "/whales", label: "Whale Tracker" },
      { href: "/richlist", label: "Rich List" },
    ]
  },
];

const directLinks = [
  { href: "/wallet", label: "Wallet" },
];

export default function Header() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMenuEnter = (label: string) => {
    if (closeTimeout) clearTimeout(closeTimeout);
    setOpenMenu(label);
  };

  const handleMenuLeave = () => {
    const timeout = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
    setCloseTimeout(timeout);
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300 transition">
            ADATool
          </Link>

          {/* Menu Items */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((menu) => (
              <div
                key={menu.label}
                className="relative group"
                onMouseEnter={() => handleMenuEnter(menu.label)}
                onMouseLeave={handleMenuLeave}
              >
                <button className="px-4 py-2 text-gray-300 hover:text-gray-100 transition text-sm font-medium">
                  {menu.label}
                </button>

                {/* Dropdown Panel */}
                {openMenu === menu.label && (
                  <div className="absolute top-full left-0 mt-0 bg-gray-900 border border-gray-800 rounded shadow-lg min-w-48 py-2">
                    {menu.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm transition ${
                          isActive(item.href)
                            ? "bg-gray-800 text-blue-400 font-medium"
                            : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Direct Links */}
            {directLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium transition ${
                  isActive(link.href)
                    ? "text-blue-400"
                    : "text-gray-300 hover:text-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Icon */}
          <Link
            href="/search"
            className="p-2 text-gray-300 hover:text-gray-100 transition"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
HEADEREOF

echo ""
echo "============================================================================"
echo "SETUP COMPLETE!"
echo "============================================================================"
echo ""
echo "Created Phase 5-7 Frontend Pages:"
echo ""
echo "PHASE 5 (7 pages):"
echo "  - src/app/(explorer)/votes/page.tsx"
echo "  - src/app/(explorer)/drep-delegations/page.tsx"
echo "  - src/app/(explorer)/constitution/page.tsx"
echo "  - src/app/(explorer)/treasury/page.tsx"
echo "  - src/app/(explorer)/tx-metadata/page.tsx"
echo "  - src/app/(explorer)/contract-txs/page.tsx"
echo "  - src/app/(explorer)/rewards-withdrawals/page.tsx"
echo ""
echo "PHASE 6 (6 pages):"
echo "  - src/app/(explorer)/delegations/page.tsx"
echo "  - src/app/(explorer)/pools/new/page.tsx"
echo "  - src/app/(explorer)/pools/retired/page.tsx"
echo "  - src/app/(explorer)/pool-updates/page.tsx"
echo "  - src/app/(explorer)/certificates/page.tsx"
echo "  - src/app/(explorer)/rewards-checker/page.tsx (client component)"
echo ""
echo "PHASE 7 (8 pages):"
echo "  - src/app/(explorer)/analytics/pots/page.tsx"
echo "  - src/app/(explorer)/analytics/treasury-projection/page.tsx"
echo "  - src/app/(explorer)/analytics/top-addresses/page.tsx"
echo "  - src/app/(explorer)/analytics/top-stakers/page.tsx"
echo "  - src/app/(explorer)/analytics/wealth/page.tsx"
echo "  - src/app/(explorer)/analytics/block-versions/page.tsx"
echo "  - src/app/(explorer)/analytics/genesis/page.tsx"
echo "  - src/app/(explorer)/analytics/tx-charts/page.tsx (client component)"
echo ""
echo "NAVIGATION:"
echo "  - src/components/navigation/Header.tsx (Cexplorer-style dropdown nav)"
echo ""
echo "All pages configured with:"
echo "  - export const dynamic = 'force-dynamic'"
echo "  - { cache: 'no-store' } in fetch calls"
echo "  - Dark theme (bg-gray-950, text-gray-100)"
echo "  - Card component styling"
echo "  - Format helpers (lovelaceToAda, compactNumber)"
echo "  - API base URL from NEXT_PUBLIC_API_URL environment variable"
echo "  - Error and empty state handling"
echo "  - Responsive table layouts"
echo ""
echo "Next steps:"
echo "  1. Update your Header component layout to use the new Header"
echo "  2. Set NEXT_PUBLIC_API_URL environment variable"
echo "  3. Test pages at their respective routes"
echo "  4. Adjust styling as needed"
echo ""
