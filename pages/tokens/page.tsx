export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card, Badge } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { lovelaceToAda, fmtAda, truncHash, compactNumber } from "@/lib/format";

interface Token {
  id: number;
  policy: string;
  asset_name: string;
  display_name?: string;
  fingerprint: string;
  tx_count: number;
}

export default async function TokensPage() {
  const page = 1;
  const tokens = await fetchAPI<Token[]>(`/tokens?page=${page}&limit=20`);

  if (!tokens) {
    return (
      <PageShell title="Tokens" breadcrumbs={[{ label: "Tokens" }]}>
        <ErrorState message="Failed to load tokens" />
      </PageShell>
    );
  }

  const columns = [
    { key: "display_name", label: "Name" },
    { key: "fingerprint", label: "Fingerprint", render: (v: string) => truncHash(v, 10) },
    { key: "policy", label: "Policy", render: (v: string) => truncHash(v, 8) },
    { key: "tx_count", label: "Transactions", render: (v: number) => compactNumber(v) },
  ];

  return (
    <PageShell title="Tokens" breadcrumbs={[{ label: "Tokens" }]}>
      <Card>
        <DataTable columns={columns} data={Array.isArray(tokens) ? tokens : []} />
      </Card>
    </PageShell>
  );
}
