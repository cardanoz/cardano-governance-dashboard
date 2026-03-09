export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { truncHash, compactNumber, timeAgo } from "@/lib/format";

interface Mint {
  policy: string;
  display_name?: string;
  fingerprint: string;
  quantity: string;
  tx_hash: string;
  time: string;
}

export default async function TokenMintsPage() {
  const mints = await fetchAPI<Mint[]>("/tokens/mints?limit=50");

  if (!mints) {
    return (
      <PageShell title="Token Mints" breadcrumbs={[{ label: "Token Mints" }]}>
        <ErrorState message="Failed to load token mints" />
      </PageShell>
    );
  }

  const columns = [
    { key: "display_name", label: "Token" },
    { key: "quantity", label: "Quantity", render: (v: string) => compactNumber(parseInt(v)) },
    { key: "tx_hash", label: "Transaction", render: (v: string) => truncHash(v, 12) },
    { key: "time", label: "Time", render: (v: string) => timeAgo(new Date(v)) },
  ];

  return (
    <PageShell title="Recent Token Mints" breadcrumbs={[{ label: "Token Mints" }]}>
      <Card>
        <DataTable columns={columns} data={Array.isArray(mints) ? mints : []} />
      </Card>
    </PageShell>
  );
}
