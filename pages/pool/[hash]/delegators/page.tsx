export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { truncHash, fmtAda } from "@/lib/format";

interface Delegator {
  address: string;
  amount: string;
}

export default async function PoolDelegatorsPage({
  params,
}: {
  params: { hash: string };
}) {
  const delegators = await fetchAPI<Delegator[]>(`/pool/${params.hash}/delegators?limit=100`);

  if (!delegators) {
    return (
      <PageShell
        title="Pool Delegators"
        breadcrumbs={[
          { label: "Pools", href: "/pools" },
          { label: params.hash, href: `/pool/${params.hash}` },
          { label: "Delegators" },
        ]}
      >
        <ErrorState message="Failed to load delegators" />
      </PageShell>
    );
  }

  const columns = [
    { key: "address", label: "Stake Address", render: (v: string) => truncHash(v, 20) },
    { key: "amount", label: "Amount", render: (v: string) => fmtAda(parseInt(v)) },
  ];

  return (
    <PageShell
      title="Top Delegators"
      breadcrumbs={[
        { label: "Pools", href: "/pools" },
        { label: params.hash, href: `/pool/${params.hash}` },
        { label: "Delegators" },
      ]}
    >
      <Card>
        <DataTable columns={columns} data={Array.isArray(delegators) ? delegators : []} />
      </Card>
    </PageShell>
  );
}
