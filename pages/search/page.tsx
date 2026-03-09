export const dynamic = "force-dynamic";

import { PageShell, ErrorState, Card } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface SearchResult {
  type: "tx" | "block" | "address" | "epoch" | "pool" | "token";
  value: string;
  label: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = (searchParams.q || "").trim();

  if (!query || query.length < 3) {
    return (
      <PageShell title="Search" breadcrumbs={[{ label: "Search" }]}>
        <Card className="text-center py-8 text-gray-400">
          Enter at least 3 characters to search (address, TX hash, block number, pool ticker, token fingerprint)
        </Card>
      </PageShell>
    );
  }

  const results = await fetchAPI<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);

  if (!results || results.length === 0) {
    return (
      <PageShell title={`Search: ${query}`} breadcrumbs={[{ label: "Search" }]}>
        <ErrorState message={`No results found for "${query}"`} />
      </PageShell>
    );
  }

  const getHref = (result: SearchResult): string => {
    switch (result.type) {
      case "tx":
        return `/tx/${result.value}`;
      case "block":
        return `/block/${result.value}`;
      case "address":
        return `/address/${result.value}`;
      case "epoch":
        return `/epoch/${result.value}`;
      case "pool":
        return `/pool/${result.value}`;
      case "token":
        return `/token/${result.value}`;
      default:
        return "/";
    }
  };

  return (
    <PageShell title={`Search Results: ${query}`} breadcrumbs={[{ label: "Search" }]}>
      <div className="space-y-3">
        {Array.isArray(results) &&
          results.map((r, i) => (
            <Card key={i} className="p-4 hover:bg-gray-700 transition">
              <Link href={getHref(r)} className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{r.type.toUpperCase()}</p>
                    <p className="text-lg">{r.label}</p>
                  </div>
                  <span className="text-blue-400">→</span>
                </div>
              </Link>
            </Card>
          ))}
      </div>
    </PageShell>
  );
}
