export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { truncHash, compactNumber } from "@/lib/format";

interface AddressToken {
  fingerprint: string;
  display_name?: string;
  policy: string;
  balance: string;
}

export default async function AddressTokensPage({
  params,
}: {
  params: { addr: string };
}) {
  const tokens = await fetchAPI<AddressToken[]>(`/address/${params.addr}/tokens`);

  if (!tokens) {
    return (
      <PageShell
        title="Address Tokens"
        breadcrumbs={[
          { label: "Address", href: `/address/${params.addr}` },
          { label: "Tokens" },
        ]}
      >
        <ErrorState message="Failed to load tokens" />
      </PageShell>
    );
  }

  const columns = [
    { key: "display_name", label: "Token" },
    { key: "fingerprint", label: "Fingerprint", render: (v: string) => truncHash(v, 10) },
    { key: "balance", label: "Balance", render: (v: string) => compactNumber(parseInt(v)) },
  ];

  return (
    <PageShell
      title="Token Holdings"
      breadcrumbs={[
        { label: "Address", href: `/address/${params.addr}` },
        { label: "Tokens" },
      ]}
    >
      <Card>
        <DataTable columns={columns} data={Array.isArray(tokens) ? tokens : []} />
      </Card>
    </PageShell>
  );
}
