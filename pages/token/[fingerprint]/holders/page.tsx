export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { compactNumber, truncHash } from "@/lib/format";

interface Holder {
  address: string;
  quantity: string;
}

export default async function TokenHoldersPage({
  params,
}: {
  params: { fingerprint: string };
}) {
  const holders = await fetchAPI<Holder[]>(`/token/${params.fingerprint}/holders?limit=100`);

  if (!holders) {
    return (
      <PageShell
        title="Token Holders"
        breadcrumbs={[
          { label: "Tokens", href: "/tokens" },
          { label: params.fingerprint, href: `/token/${params.fingerprint}` },
          { label: "Holders" },
        ]}
      >
        <ErrorState message="Failed to load holders" />
      </PageShell>
    );
  }

  const columns = [
    { key: "address", label: "Address", render: (v: string) => truncHash(v, 20) },
    { key: "quantity", label: "Balance", render: (v: string) => compactNumber(parseInt(v)) },
  ];

  return (
    <PageShell
      title="Top Token Holders"
      breadcrumbs={[
        { label: "Tokens", href: "/tokens" },
        { label: params.fingerprint, href: `/token/${params.fingerprint}` },
        { label: "Holders" },
      ]}
    >
      <Card>
        <DataTable columns={columns} data={Array.isArray(holders) ? holders : []} />
      </Card>
    </PageShell>
  );
}
