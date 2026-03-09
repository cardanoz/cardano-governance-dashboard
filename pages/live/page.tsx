'use client';

import { useEffect, useState } from "react";
import { PageShell, Card, ErrorState } from "@/components/ui";
import { truncHash, timeAgo } from "@/lib/format";

interface LiveBlock {
  id: number;
  block_no: number;
  hash: string;
  time: string;
}

export default function LivePage() {
  const [blocks, setBlocks] = useState<LiveBlock[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch live stats
    const fetchStats = async () => {
      const res = await fetch("/api/stats/live");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 10000);

    // Connect to block stream
    const eventSource = new EventSource("/api/stream/blocks");

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onmessage = (event) => {
      try {
        const block = JSON.parse(event.data);
        setBlocks((prev) => [block, ...prev.slice(0, 19)]);
      } catch (e) {
        console.error("Failed to parse block:", e);
      }
    };
    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      clearInterval(statsInterval);
    };
  }, []);

  return (
    <PageShell title="Live Network" breadcrumbs={[{ label: "Live" }]}>
      <div className="space-y-4">
        {stats && (
          <Card className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Latest Block</p>
                <p className="text-2xl font-bold">#{stats.block_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Epoch</p>
                <p className="text-2xl font-bold">{stats.epoch_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Txs Today</p>
                <p className="text-2xl font-bold">{stats.tx_count_today}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Est. TPS</p>
                <p className="text-2xl font-bold">{stats.tps}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-400">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Recent Blocks</h2>
          {blocks.length === 0 ? (
            <p className="text-gray-400">Waiting for blocks...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-500 transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm">
                      Block #{block.block_no}
                    </span>
                    <span className="text-xs text-gray-400">
                      {timeAgo(new Date(block.time))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {truncHash(block.hash, 20)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
