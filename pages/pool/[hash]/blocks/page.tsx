export const dynamic = "force-dynamic";

import { PageShell, DataTable, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo } from "@/lib/format";

interface BlockProduced {
  block_no: number;
  epoch_no: number;
  slot_no: number;
  hash: string;
  time: string;
  tx_count: number;
}

export default async function PoolBlocksPage({
  params,
}: {
  params: { hash: string };
}) {
  const blocks = await fetchAPI<BlockProduced[]>(`/pool/${params.hash}/blocks?limit=50`);

  if (!blocks) {
    return (
      <PageShell
        title="Pool Blocks"
        breadcrumbs={[
          { label: "Pools", href: "/pools" },
          { label: params.hash, href: `/pool/${params.hash}` },
          { label: "Blocks" },
        ]}
      >
        <ErrorState message="Failed to load blocks" />
      </PageShell>
    );
  }

  const columns = [
    { key: "block_no", label: "Block #" },
    { key: "epoch_no", label: "Epoch" },
    { key: "tx_count", label: "Txs" },
    { key: "time", label: "Time", render: (v: string) => timeAgo(new Date(v)) },
  ];

  return (
    <PageShell
      title="Blocks Produced"
      breadcrumbs={[
        { label: "Pools", href: "/pools" },
        { label: params.hash, href: `/pool/${params.hash}` },
        { label: "Blocks" },
      ]}
    >
      <Card>
        <DataTable columns={columns} data={Array.isArray(blocks) ? blocks : []} />
      </Card>
    </PageShell>
  );
}
