export const dynamic = "force-dynamic";

import { PageShell, ErrorState, Card, Badge } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { truncHash, compactNumber } from "@/lib/format";
import Link from "next/link";

interface TokenDetail {
  policy: string;
  asset_name: string;
  display_name?: string;
  fingerprint: string;
  total_minted?: string;
  tx_count: number;
}

export default async function TokenDetailPage({
  params,
}: {
  params: { fingerprint: string };
}) {
  const token = await fetchAPI<TokenDetail>(`/token/${params.fingerprint}`);

  if (!token) {
    return (
      <PageShell
        title="Token Not Found"
        breadcrumbs={[
          { label: "Tokens", href: "/tokens" },
          { label: params.fingerprint },
        ]}
      >
        <ErrorState message="Token not found" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={token.display_name || "Token"}
      breadcrumbs={[
        { label: "Tokens", href: "/tokens" },
        { label: token.display_name || params.fingerprint },
      ]}
    >
      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400">Name</label>
            <p className="text-lg font-mono">{token.display_name}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400">Fingerprint</label>
            <p className="text-lg font-mono">{token.fingerprint}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400">Policy</label>
            <p className="text-lg font-mono">{truncHash(token.policy, 16)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400">Total Minted</label>
              <p className="text-lg">{compactNumber(parseInt(token.total_minted || "0"))}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400">Transactions</label>
              <p className="text-lg">{compactNumber(token.tx_count)}</p>
            </div>
          </div>
          <Link href={`/token/${params.fingerprint}/holders`} className="text-blue-400 hover:underline">
            View Top Holders →
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
