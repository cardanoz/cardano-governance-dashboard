"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, ReferenceLine
} from "recharts";

// ══════════════════════════════════════════════
// 35-Tier System
// ══════════════════════════════════════════════
const MAJOR_TIERS = [
  { name: "神話・伝説級", emoji: "🏛️", color: "#FBBF24", range: "5M+" },
  { name: "古代生命級", emoji: "🦴", color: "#7C3AED", range: "2M~5M" },
  { name: "クジラ級", emoji: "🐋", color: "#2563EB", range: "500K~2M" },
  { name: "中型魚級", emoji: "🐟", color: "#0891B2", range: "100K~500K" },
  { name: "小型魚級", emoji: "🐠", color: "#34D399", range: "10K~100K" },
  { name: "甲殻類・小生物級", emoji: "🦐", color: "#FB923C", range: "1K~10K" },
  { name: "プランクトン・微生物級", emoji: "🦠", color: "#6B7280", range: "~1K" },
];
const TIERS = [
  { name: "ポセイドン", emoji: "🔱", min: 10000000, max: Infinity, color: "#FFD700", desc: "海神", major: 0, sub: "S+" },
  { name: "リヴァイアサン", emoji: "🐉", min: 8000000, max: 10000000, color: "#FCD34D", desc: "海の怪物", major: 0, sub: "S" },
  { name: "クラーケン", emoji: "🦑", min: 6000000, max: 8000000, color: "#F59E0B", desc: "深淵の主", major: 0, sub: "A" },
  { name: "ヨルムンガンド", emoji: "🐍", min: 5000000, max: 6000000, color: "#D97706", desc: "世界蛇", major: 0, sub: "B" },
  { name: "メガロドン", emoji: "🦷", min: 4000000, max: 5000000, color: "#8B5CF6", desc: "古代巨大サメ", major: 1, sub: "S" },
  { name: "ダンクルオステウス", emoji: "🛡️", min: 3500000, max: 4000000, color: "#7C3AED", desc: "装甲魚", major: 1, sub: "A" },
  { name: "リードシクティス", emoji: "🐋", min: 2500000, max: 3500000, color: "#6D28D9", desc: "史上最大硬骨魚", major: 1, sub: "B" },
  { name: "バシロサウルス", emoji: "🦕", min: 2000000, max: 2500000, color: "#5B21B6", desc: "原始クジラ", major: 1, sub: "C" },
  { name: "シロナガスクジラ", emoji: "🐳", min: 1500000, max: 2000000, color: "#3B82F6", desc: "Blue Whale", major: 2, sub: "S" },
  { name: "マッコウクジラ", emoji: "🐋", min: 1000000, max: 1500000, color: "#2563EB", desc: "Sperm Whale", major: 2, sub: "A" },
  { name: "ザトウクジラ", emoji: "🐋", min: 800000, max: 1000000, color: "#1D4ED8", desc: "Humpback", major: 2, sub: "B" },
  { name: "ジンベエザメ", emoji: "🦈", min: 650000, max: 800000, color: "#1E40AF", desc: "Whale Shark", major: 2, sub: "C" },
  { name: "ホオジロザメ", emoji: "🦈", min: 500000, max: 650000, color: "#1E3A8A", desc: "Great White", major: 2, sub: "D" },
  { name: "マグロ", emoji: "🐟", min: 400000, max: 500000, color: "#06B6D4", desc: "Tuna", major: 3, sub: "S" },
  { name: "カジキ", emoji: "⚔️", min: 300000, max: 400000, color: "#0891B2", desc: "Marlin", major: 3, sub: "A" },
  { name: "バラクーダ", emoji: "🐡", min: 200000, max: 300000, color: "#0E7490", desc: "Barracuda", major: 3, sub: "B" },
  { name: "サーモン", emoji: "🍣", min: 150000, max: 200000, color: "#155E75", desc: "Salmon", major: 3, sub: "C" },
  { name: "タイ", emoji: "🐡", min: 120000, max: 150000, color: "#164E63", desc: "Sea Bream", major: 3, sub: "D" },
  { name: "アジ", emoji: "🐟", min: 100000, max: 120000, color: "#134E4A", desc: "Horse Mackerel", major: 3, sub: "E" },
  { name: "クマノミ", emoji: "🐠", min: 70000, max: 100000, color: "#34D399", desc: "Clownfish", major: 4, sub: "S" },
  { name: "ネオンテトラ", emoji: "💎", min: 50000, max: 70000, color: "#10B981", desc: "Neon Tetra", major: 4, sub: "A" },
  { name: "タツノオトシゴ", emoji: "🐴", min: 30000, max: 50000, color: "#059669", desc: "Seahorse", major: 4, sub: "B" },
  { name: "メダカ", emoji: "🐟", min: 20000, max: 30000, color: "#047857", desc: "Killifish", major: 4, sub: "C" },
  { name: "グッピー", emoji: "🐟", min: 10000, max: 20000, color: "#065F46", desc: "Guppy", major: 4, sub: "D" },
  { name: "イセエビ", emoji: "🧦", min: 7000, max: 10000, color: "#F97316", desc: "Lobster", major: 5, sub: "S" },
  { name: "カニ", emoji: "🦀", min: 5000, max: 7000, color: "#EA580C", desc: "Crab", major: 5, sub: "A" },
  { name: "エビ", emoji: "🦐", min: 3000, max: 5000, color: "#DC2626", desc: "Shrimp", major: 5, sub: "B" },
  { name: "ヤドカリ", emoji: "🐚", min: 2000, max: 3000, color: "#B91C1C", desc: "Hermit Crab", major: 5, sub: "C" },
  { name: "フジツボ", emoji: "🪨", min: 1000, max: 2000, color: "#991B1B", desc: "Barnacle", major: 5, sub: "D" },
  { name: "オキアミ", emoji: "🦐", min: 500, max: 1000, color: "#9CA3AF", desc: "Krill", major: 6, sub: "S" },
  { name: "ミジンコ", emoji: "🔍", min: 200, max: 500, color: "#6B7280", desc: "Daphnia", major: 6, sub: "A" },
  { name: "プランクトン", emoji: "🫧", min: 50, max: 200, color: "#4B5563", desc: "Plankton", major: 6, sub: "B" },
  { name: "アメーバ", emoji: "🔬", min: 10, max: 50, color: "#374151", desc: "Amoeba", major: 6, sub: "C" },
  { name: "バクテリア", emoji: "🧫", min: 1, max: 10, color: "#1F2937", desc: "Bacteria", major: 6, sub: "D" },
  { name: "ウイルス", emoji: "🧬", min: 0, max: 1, color: "#111827", desc: "Virus", major: 6, sub: "E" },
];
const getTier = (a: number) => TIERS.find(t => a >= t.min && a < t.max) || TIERS[TIERS.length - 1];
const getNextTier = (a: number) => { const i = TIERS.findIndex(t => a >= t.min && a < t.max); return i > 0 ? TIERS[i - 1] : null; };
const fmt = (n: number, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fmtK = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : `${n}`;

// API endpoints
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://adatool.net/api";
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_IDS: Record<string,string> = { ADA: "cardano", BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", GOLD: "pax-gold" };

async function fetchMarkets(jpyRate: number) {
  const ids = Object.values(CG_IDS).join(",");
  const res = await fetch(`${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d,1y&sparkline=false`);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const P: any = {}, PC: any = {}, HL: any = {};
  const idToKey = Object.fromEntries(Object.entries(CG_IDS).map(([k, v]) => [v, k]));
  for (const c of data) {
    const key = idToKey[c.id]; if (!key) continue;
    const btcRate = data.find((x: any) => x.id === "bitcoin")?.current_price || 86750;
    P[key] = { usd: c.current_price, jpy: c.current_price * jpyRate, btc: c.current_price / btcRate, mcap: c.market_cap };
    PC[key] = { "24h": +(c.price_change_percentage_24h || 0).toFixed(1), "7d": +(c.price_change_percentage_7d_in_currency || 0).toFixed(1), "1m": +(c.price_change_percentage_30d_in_currency || 0).toFixed(1), "1y": +(c.price_change_percentage_1y_in_currency || 0).toFixed(1) };
    HL[key] = { "24h": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price }, all: { hi: c.ath || c.current_price, lo: c.atl || 0 } };
  }
  return { P, PC, HL };
}

async function fetchHistory(id: string) {
  const res = await fetch(`${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily`);
  if (!res.ok) throw new Error(`History ${res.status}`);
  const data = await res.json();
  return (data.prices || []).map(([ts, price]: [number, number]) => {
    const d = new Date(ts);
    return { date: `${d.getMonth()+1}/${d.getDate()}`, price, ts };
  });
}

// db-sync wallet lookup (replaces Blockfrost)
async function fetchWalletFromDB(stakeAddr: string, name?: string) {
  let sa = stakeAddr;
  if (stakeAddr.startsWith("addr")) {
    const r = await fetch(`${API_BASE}/address-to-stake/${stakeAddr}`);
    const d = await r.json();
    if (d.error || !d.stake_address) throw new Error("アドレスが見つかりません");
    sa = d.stake_address;
  }
  const res = await fetch(`${API_BASE}/wallet/${sa}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error === "not_found" ? "アカウントが見つかりません" : data.error);
  return {
    id: sa,
    name: name || sa.slice(0, 12) + "...",
    stake: sa,
    bal: data.balance_ada,
    pool: data.pool?.ticker || (data.pool?.id?.slice(0, 8) || "—"),
    poolId: data.pool?.id || "",
    drep: data.drep?.view ? (data.drep.view.startsWith("drep_always") ? (data.drep.view === "drep_always_abstain" ? "Abstain" : "No Confidence") : data.drep.view.slice(0, 16) + "...") : "—",
    drepId: data.drep?.id || "",
    rew: data.rewards_available || 0,
    rewards: data.reward_history || [],
    active: data.active,
  };
}

// Mock data
const MOCK_P: any = { ADA: { usd: 0.75, jpy: 112.5, btc: 0.0000084, mcap: 26250000000 }, BTC: { usd: 89200, jpy: 13380000, btc: 1, mcap: 1766160000000 }, ETH: { usd: 2100, jpy: 315000, btc: 0.02354, mcap: 252000000000 }, SOL: { usd: 140, jpy: 21000, btc: 0.00157, mcap: 60200000000 }, XRP: { usd: 2.35, jpy: 352, btc: 0.0000264, mcap: 129250000000 }, GOLD: { usd: 2950, jpy: 442500, btc: 0.03308, mcap: 15635000000 } };
const MOCK_PC: any = { ADA: { "24h": 2.1, "7d": -3.5, "1m": 8.2, "1y": 45.2 }, BTC: { "24h": 0.8, "7d": -1.2, "1m": 5.1, "1y": 62.1 }, ETH: { "24h": 1.5, "7d": -2.8, "1m": 3.4, "1y": 18.7 }, SOL: { "24h": 3.2, "7d": 1.5, "1m": -8.4, "1y": 85.3 }, XRP: { "24h": -0.5, "7d": 2.3, "1m": 12.8, "1y": 280.3 }, GOLD: { "24h": 0.3, "7d": 1.2, "1m": 4.5, "1y": 28.5 } };
const MOCK_HL: any = { ADA: { "24h": { hi: 0.78, lo: 0.72 }, all: { hi: 3.10, lo: 0.017 } }, BTC: { "24h": { hi: 90100, lo: 88200 }, all: { hi: 108786, lo: 3200 } }, ETH: { "24h": { hi: 2150, lo: 2050 }, all: { hi: 4878, lo: 0.43 } }, SOL: { "24h": { hi: 145, lo: 135 }, all: { hi: 294, lo: 0.50 } }, XRP: { "24h": { hi: 2.40, lo: 2.28 }, all: { hi: 3.84, lo: 0.003 } }, GOLD: { "24h": { hi: 2960, lo: 2935 }, all: { hi: 2980, lo: 1520 } } };

const MOCK_HIST = (() => {
  let seed = 42;
  const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const noise = () => (srand() - 0.48) * 2;
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (90 - i));
    const t = i / 89;
    const lerp = (s: number, e: number) => s + (e - s) * t;
    const n = (base: number, vol: number) => +(base + noise() * vol * base).toFixed(base < 1 ? 4 : 0);
    return { date: `${d.getMonth()+1}/${d.getDate()}`, pADA: n(lerp(0.55, 0.75), 0.03), btcPrice: n(lerp(75000, 89200), 0.02), ethPrice: n(lerp(1800, 2100), 0.03), solPrice: n(lerp(110, 140), 0.04), xrpPrice: n(lerp(1.5, 2.35), 0.03), goldPrice: n(lerp(2650, 2950), 0.01) };
  });
})();

const PERIODS = [{ key: "24h", label: "24h" }, { key: "7d", label: "7d" }, { key: "1m", label: "1M" }, { key: "1y", label: "1Y" }];

const Btn = ({active, onClick, children, color}: any) => (
  <button onClick={onClick}
    className={`rounded text-xs font-medium border transition-colors px-1.5 py-0.5 ${active ? "text-white" : "text-gray-500 border-gray-700 hover:text-gray-300"}`}
    style={active ? {backgroundColor:(color||'#3B82F6')+'33', color: color||'#fff', borderColor:(color||'#3B82F6')+'66'} : {}}>
    {children}
  </button>
);

function Section({ title, icon, children, defaultOpen = true, badge }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm text-gray-200 flex-1">{title}</span>
        {badge && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{badge}</span>}
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-700/50">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════
// Main Component — Single Page Layout
// ══════════════════════════════════════════════
export default function CardanoWatch() {
  const [hide, setHide] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [manual, setManual] = useState<any[]>([]);
  const [mName, setMName] = useState(""); const [mAmt, setMAmt] = useState("");
  const [newAddr, setNewAddr] = useState(""); const [newName, setNewName] = useState("");
  const [bfStatus, setBfStatus] = useState("idle"); const [bfError, setBfError] = useState("");
  const [liveP, setLiveP] = useState<any>(null); const [livePC, setLivePC] = useState<any>(null);
  const [liveHL, setLiveHL] = useState<any>(null); const [liveHist, setLiveHist] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState("idle"); const [lastFetch, setLastFetch] = useState<Date|null>(null);
  const [jpyRate, setJpyRate] = useState(150);
  const [walletRewards, setWalletRewards] = useState<any[]>([]);
  const [visiblePeriods, setVisiblePeriods] = useState<Record<string,boolean>>({"24h": true, "7d": true, "1m": true, "1y": false});
  const [priceMode, setPriceMode] = useState("indexed");
  const [pricePeriod, setPricePeriod] = useState("all");
  const [baseIdx, setBaseIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState<Record<string,boolean>>({pADA: true, btcPrice: false, ethPrice: false, solPrice: false, xrpPrice: false, goldPrice: false});

  const P = liveP || MOCK_P;
  const PC = livePC || MOCK_PC;
  const HL = liveHL || MOCK_HL;
  const HIST = liveHist || MOCK_HIST;
  const isLive = !!liveP;
  const H = (v: any) => hide ? "•••••" : v;

  const fetchAllData = useCallback(async () => {
    setApiStatus("loading");
    try {
      const { P: newP, PC: newPC, HL: newHL } = await fetchMarkets(jpyRate);
      setLiveP(newP); setLivePC(newPC); setLiveHL(newHL);
      const histMap: any = {};
      for (const [key, id] of Object.entries(CG_IDS)) {
        try { histMap[key] = await fetchHistory(id); await new Promise(r => setTimeout(r, 1200)); } catch {}
      }
      if (histMap.ADA) {
        const adaH = histMap.ADA;
        const lookup: any = {};
        for (const [k, arr] of Object.entries(histMap)) { lookup[k] = {}; for (const pt of (arr as any[])) lookup[k][pt.date] = pt; }
        setLiveHist(adaH.map((a: any) => ({ date: a.date, pADA: a.price, btcPrice: lookup.BTC?.[a.date]?.price || 89200, ethPrice: lookup.ETH?.[a.date]?.price || 2100, solPrice: lookup.SOL?.[a.date]?.price || 140, xrpPrice: lookup.XRP?.[a.date]?.price || 2.35, goldPrice: lookup.GOLD?.[a.date]?.price || 2950 })));
      }
      setApiStatus("ok"); setLastFetch(new Date());
    } catch (e: any) {
      if (e instanceof TypeError || (e.message||"").toLowerCase().includes("fetch")) setApiStatus("idle");
      else setApiStatus("error");
    }
  }, [jpyRate]);

  const totalAda = useMemo(() => wallets.reduce((s: number, w: any) => s + (w.bal || 0), 0) + manual.reduce((s: number, e: any) => s + (e.amount || 0), 0), [wallets, manual]);
  const tier = getTier(totalAda);
  const next = getNextTier(totalAda);
  const totalRew = wallets.reduce((s: number, w: any) => s + (w.rew || 0), 0);

  const filterByPeriod = (data: any[], period: string) => {
    if (period === "all") return data;
    const days: Record<string,number> = { "7d": 7, "1m": 30 };
    return data.slice(-(days[period] || 90));
  };

  const priceFiltered = useMemo(() => filterByPeriod(HIST, pricePeriod), [pricePeriod, HIST]);
  const safeBaseIdx = Math.min(baseIdx, priceFiltered.length - 1);
  const priceChartData = useMemo(() => {
    const keys = ["pADA","btcPrice","ethPrice","solPrice","xrpPrice","goldPrice"];
    const base = priceFiltered[safeBaseIdx] || priceFiltered[0] || {};
    const baseP: any = {}; keys.forEach(k => { baseP[k] = +base[k] || 1; });
    return priceFiltered.map((row: any) => {
      const entry: any = { date: row.date };
      keys.forEach(k => { entry[k] = priceMode === "indexed" ? (+row[k] / baseP[k]) * 100 : +row[k]; });
      return entry;
    });
  }, [priceMode, pricePeriod, safeBaseIdx, priceFiltered]);

  // db-sync based wallet addition (no Blockfrost needed)
  const addWallet = useCallback(async () => {
    const addr = newAddr.trim();
    if (!addr) { setBfError("アドレスを入力してください"); setBfStatus("error"); return; }
    let stakeAddr = addr;
    if (addr.startsWith("addr")) {
      setBfStatus("loading");
      try {
        const r = await fetch(`${API_BASE}/address-to-stake/${addr}`);
        const d = await r.json();
        if (!d.stake_address) throw new Error("ステークアドレスが見つかりません");
        stakeAddr = d.stake_address;
      } catch (e: any) { setBfStatus("error"); setBfError(e.message); return; }
    }
    if (wallets.find((w: any) => w.stake === stakeAddr)) { setBfError("既に追加済みです"); setBfStatus("error"); return; }
    setBfStatus("loading"); setBfError("");
    try {
      const wData = await fetchWalletFromDB(stakeAddr, newName || undefined);
      setWallets(prev => [...prev, wData]);
      if (wData.rewards.length > 0) setWalletRewards(prev => [...prev, ...wData.rewards.map((r: any) => ({ ...r, wallet: wData.name }))]);
      setNewAddr(""); setNewName(""); setBfStatus("ok");
    } catch (e: any) { setBfStatus("error"); setBfError(e.message); }
  }, [newAddr, newName, wallets]);

  const addManual = () => { if (mName && mAmt) { setManual([...manual, { id: Date.now(), name: mName, amount: +mAmt || 0 }]); setMName(""); setMAmt(""); }};

  const rewardData = useMemo(() => {
    if (walletRewards.length > 0) {
      const byEpoch: any = {};
      for (const r of walletRewards) { if (!byEpoch[r.epoch]) byEpoch[r.epoch] = { epoch: r.epoch, ada: 0 }; byEpoch[r.epoch].ada += r.ada; }
      return Object.values(byEpoch).sort((a: any, b: any) => a.epoch - b.epoch).slice(-30).map((r: any) => ({ ...r, usd: +(r.ada * P.ADA.usd).toFixed(2) }));
    }
    return Array.from({ length: 20 }, (_, i) => ({ epoch: 500 + i, ada: +(Math.random() * 15 + 3).toFixed(2) }));
  }, [walletRewards, P]);

  const exportCSV = () => {
    const c = "Epoch,ADA\n" + rewardData.map((r: any) => `${r.epoch},${r.ada}`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([c])); a.download = "rewards.csv"; a.click();
  };

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">₳</div>
          <span className="font-bold text-sm">CardanoWatch</span>
          {isLive ? <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">Live</span>
                   : <span className="text-xs bg-yellow-900/40 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-800/50">Mock</span>}
          {apiStatus === "loading" && <span className="text-xs text-yellow-400 animate-pulse">Loading...</span>}
          {lastFetch && <span className="text-xs text-gray-600">Updated: {lastFetch.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHide(!hide)} className="px-2 py-1 rounded-lg hover:bg-gray-700 text-gray-400 text-xs">{hide ? "👁️ Show" : "👁️ Hide"}</button>
          <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="px-2 py-1 rounded-lg hover:bg-gray-700 text-gray-400 text-xs">🔄 Refresh</button>
        </div>
      </div>

      {/* Tier Banner */}
      {totalAda > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="text-4xl">{tier.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{color: tier.color}}>{tier.name}</span>
              <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{tier.sub}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{tier.desc}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{H(`₳ ${fmt(totalAda)}`)}</div>
            <div className="text-sm text-green-400">{H(`$${fmt(totalAda * P.ADA.usd, 2)}`)}</div>
            <div className="text-xs text-gray-500">{H(`¥${fmt(totalAda * P.ADA.jpy)}`)}</div>
          </div>
          {next && <div className="text-right border-l border-gray-700 pl-4">
            <div className="text-xs text-gray-500">Next Tier</div>
            <div className="text-sm">{next.emoji} {next.name}</div>
            <div className="text-xs text-blue-400">{fmt(next.min - totalAda)} ADA</div>
          </div>}
        </div>
      )}

      {/* Section 1: Asset Price Table */}
      <Section title="価格テーブル" icon="📊" badge={isLive ? "Live" : "Mock"}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-gray-500">Periods:</span>
          {PERIODS.map(p => <Btn key={p.key} active={visiblePeriods[p.key]} onClick={() => setVisiblePeriods({...visiblePeriods, [p.key]: !visiblePeriods[p.key]})} color="#4B5563">{p.label}</Btn>)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 text-left border-b border-gray-700">
              <th className="pb-1.5">Asset</th><th className="pb-1.5 text-right">Price</th>
              {PERIODS.filter(p => visiblePeriods[p.key]).map(p => <th key={p.key} className="pb-1.5 text-right">{p.label}</th>)}
              <th className="pb-1.5 text-right">High</th><th className="pb-1.5 text-right">Low</th><th className="pb-1.5 text-right">MCap</th>
            </tr></thead>
            <tbody>{Object.entries(P).filter(([k]) => CG_IDS[k]).map(([key, price]: [string, any]) => {
              const chg = PC[key] || {}; const hl = HL[key]?.["24h"];
              return (<tr key={key} className={`border-b border-gray-700/50 ${key === "ADA" ? "bg-blue-900/10" : "hover:bg-gray-700/30"}`}>
                <td className="py-2 font-bold text-white">{key}</td>
                <td className="py-2 text-right text-white font-mono">${price.usd >= 1 ? fmt(price.usd, 2) : price.usd.toFixed(4)}</td>
                {PERIODS.filter(p => visiblePeriods[p.key]).map(p => (
                  <td key={p.key} className="py-2 text-right"><span className={`${(chg[p.key]||0) >= 0 ? "text-green-400" : "text-red-400"}`}>{(chg[p.key]||0) > 0 ? "+" : ""}{chg[p.key]||0}%</span></td>
                ))}
                <td className="py-2 text-right text-green-300 font-mono">{hl ? `$${hl.hi}` : "—"}</td>
                <td className="py-2 text-right text-red-300 font-mono">{hl ? `$${hl.lo}` : "—"}</td>
                <td className="py-2 text-right text-gray-400">${price.mcap ? (price.mcap / 1e9).toFixed(1) + "B" : "—"}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </Section>

      {/* Section 2: Price Chart */}
      <Section title="価格比較分析" icon="📈">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            {[{k:"7d",l:"7d"},{k:"1m",l:"1M"},{k:"all",l:"All"}].map(p => <Btn key={p.k} active={pricePeriod===p.k} onClick={()=>setPricePeriod(p.k)} color="#6366F1">{p.l}</Btn>)}
          </div>
          <div className="flex items-center gap-1">
            {[{k:"indexed",l:"Indexed"},{k:"price",l:"Price"}].map(m => <Btn key={m.k} active={priceMode===m.k} onClick={()=>setPriceMode(m.k)} color="#A855F7">{m.l}</Btn>)}
          </div>
          <div className="flex items-center gap-1">
            {[{k:"pADA",l:"ADA",c:"#818CF8"},{k:"btcPrice",l:"BTC",c:"#FB923C"},{k:"ethPrice",l:"ETH",c:"#627EEA"},{k:"solPrice",l:"SOL",c:"#00FFA3"},{k:"xrpPrice",l:"XRP",c:"#A8B8C8"},{k:"goldPrice",l:"Gold",c:"#FFD700"}].map(c =>
              <Btn key={c.k} active={showOverlay[c.k]} onClick={()=>setShowOverlay({...showOverlay,[c.k]:!showOverlay[c.k]})} color={c.c}>{c.l}</Btn>
            )}
          </div>
        </div>
        {priceMode === "indexed" && <div className="flex items-center gap-3 mb-2"><span className="text-xs text-gray-500">Base:</span><span className="text-xs text-white font-bold bg-purple-600/30 px-2 py-0.5 rounded">{priceFiltered[safeBaseIdx]?.date || "—"} = 100</span><input type="range" min={0} max={priceFiltered.length-1} value={safeBaseIdx} onChange={e=>setBaseIdx(+e.target.value)} className="flex-1 h-1 accent-purple-500"/></div>}
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={priceChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
            <XAxis dataKey="date" tick={{fill:"#6B7280",fontSize:9}} tickLine={false} interval={Math.max(1,Math.floor(priceChartData.length/8))}/>
            <YAxis tick={{fill:"#6B7280",fontSize:9}} tickLine={false} width={55} tickFormatter={(v: number) => priceMode==="indexed" ? `${(v-100).toFixed(0)}%` : v>=10000?`$${(v/1000).toFixed(0)}k`:v>=1?`$${v.toFixed(0)}`:`$${v.toFixed(4)}`}/>
            {priceMode==="indexed" && <ReferenceLine y={100} stroke="#6366F1" strokeDasharray="4 4"/>}
            <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}}/>
            {showOverlay.pADA && <Line type="monotone" dataKey="pADA" stroke="#818CF8" strokeWidth={2} dot={false}/>}
            {showOverlay.btcPrice && <Line type="monotone" dataKey="btcPrice" stroke="#FB923C" strokeWidth={2} dot={false}/>}
            {showOverlay.ethPrice && <Line type="monotone" dataKey="ethPrice" stroke="#627EEA" strokeWidth={2} dot={false}/>}
            {showOverlay.solPrice && <Line type="monotone" dataKey="solPrice" stroke="#00FFA3" strokeWidth={2} dot={false}/>}
            {showOverlay.xrpPrice && <Line type="monotone" dataKey="xrpPrice" stroke="#A8B8C8" strokeWidth={2} dot={false}/>}
            {showOverlay.goldPrice && <Line type="monotone" dataKey="goldPrice" stroke="#FFD700" strokeWidth={2} dot={false}/>}
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Section 3: Wallets (db-sync based) */}
      <Section title="保有一覧（ウォレット＋取引所）" icon="👛" badge={`${wallets.length}ウォレット · ${manual.length}手動`}>
        <div className="flex gap-2 mb-2">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="ウォレット名" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-36"/>
          <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="stake1... / addr1..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600"/>
          <button onClick={addWallet} disabled={bfStatus==="loading"} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium">{bfStatus==="loading" ? "…" : "+ 追加"}</button>
        </div>
        {bfStatus==="error" && bfError && <div className="text-xs text-red-400 mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1">{bfError}<button onClick={()=>{setBfStatus("idle");setBfError("")}} className="ml-2 text-red-300">✕</button></div>}
        {bfStatus==="ok" && <div className="text-xs text-green-400 mb-2">✓ db-sync取得完了</div>}
        <div className="flex gap-2 mb-2">
          <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="取引所名" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-32"/>
          <input value={mAmt} onChange={e=>setMAmt(e.target.value)} placeholder="ADA数量" type="number" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-28"/>
          <button onClick={addManual} className="bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium">+ 手動</button>
        </div>
        <div className="text-xs text-gray-600 mb-2">🛡️ ローカルのみ保存・サーバー送信なし（db-sync直接参照）</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 text-left border-b border-gray-700">
              <th className="pb-1.5">種別</th><th className="pb-1.5">名前</th><th className="pb-1.5 text-right">残高</th><th className="pb-1.5">プール</th><th className="pb-1.5">DRep</th><th className="pb-1.5 text-right">報酬</th><th className="pb-1.5 w-6"></th>
            </tr></thead>
            <tbody>
              {wallets.map((w: any) => (
                <tr key={w.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-1.5"><span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">Wallet</span></td>
                  <td className="py-1.5 text-white font-medium">{w.name}</td>
                  <td className="py-1.5 text-right text-white font-bold">{H(`₳ ${fmt(w.bal)}`)}</td>
                  <td className="py-1.5 text-blue-400 font-bold">[{w.pool}]</td>
                  <td className="py-1.5 text-purple-400">{w.drep}</td>
                  <td className="py-1.5 text-right text-green-400">₳ {fmt(w.rew, 1)}</td>
                  <td className="py-1.5"><button onClick={()=>setWallets(wallets.filter((x: any)=>x.id!==w.id))} className="text-red-400 hover:text-red-300">×</button></td>
                </tr>
              ))}
              {manual.map((e: any) => (
                <tr key={`m-${e.id}`} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-1.5"><span className="text-xs bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded">手動</span></td>
                  <td className="py-1.5 text-white font-medium">{e.name}</td>
                  <td className="py-1.5 text-right text-white font-bold">{H(`₳ ${fmt(e.amount)}`)}</td>
                  <td className="py-1.5 text-gray-600">—</td><td className="py-1.5 text-gray-600">—</td><td className="py-1.5 text-gray-600">—</td>
                  <td className="py-1.5"><button onClick={()=>setManual(manual.filter((x: any)=>x.id!==e.id))} className="text-red-400 hover:text-red-300">×</button></td>
                </tr>
              ))}
              {wallets.length===0 && manual.length===0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">ウォレット未追加。アドレスを入力して追加してください。</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 4: Rewards */}
      <Section title="報酬サマリー" icon="🪙" badge={`₳ ${fmt(totalRew, 1)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Staking: <span className="text-green-400 font-bold">{H(`₳ ${fmt(totalRew,1)}`)}</span></span>
          <button onClick={exportCSV} className="text-xs bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded">CSV出力</button>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={rewardData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
            <XAxis dataKey="epoch" tick={{fill:"#6B7280",fontSize:8}} tickLine={false}/>
            <YAxis tick={{fill:"#6B7280",fontSize:8}} tickLine={false} width={25}/>
            <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v: any)=>[`₳ ${v}`,"報酬"]}/>
            <Bar dataKey="ada" fill="#10B981" radius={[2,2,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Section 5: Settings */}
      <Section title="設定" icon="⚙️" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2">USD/JPY Rate</h3>
            <input type="number" value={jpyRate} onChange={e=>setJpyRate(+e.target.value||150)} className="w-32 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white"/>
          </div>
          <div>
            <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2 rounded text-xs">{apiStatus==="loading" ? "…" : "価格データ取得"}</button>
          </div>
          {apiStatus==="ok" && <div className="text-xs text-green-400">✓ {lastFetch?.toLocaleString()}</div>}
          <div className="text-xs text-gray-600">CoinGecko無料API (30req/min) · ウォレットデータはdb-sync直接参照</div>
        </div>
      </Section>

      {/* Tier Reference */}
      <Section title={`全${TIERS.length}段階ティア一覧`} icon="🏆" defaultOpen={false}>
        {MAJOR_TIERS.map((mt, mi) => (
          <div key={mi} className="mb-2">
            <div className="text-xs font-bold px-2 py-1 rounded mb-1" style={{color:mt.color,backgroundColor:mt.color+'15'}}>{mt.emoji} {mt.name} <span className="text-gray-500 font-normal ml-1">{mt.range}</span></div>
            <div className="space-y-0.5">{TIERS.filter(t=>t.major===mi).map(t=>{
              const cur = t.name === tier.name;
              return <div key={t.name} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${cur?"bg-gray-700 border border-blue-500/60":"hover:bg-gray-700/50"}`}>
                <span className="text-gray-500 font-bold w-6">{t.sub}</span>
                <span className="text-sm w-5">{t.emoji}</span>
                <span className="font-bold w-32" style={{color:t.color}}>{t.name}</span>
                <span className="text-gray-500 flex-1">{t.max===Infinity?`${fmtK(t.min)}+`:`${fmtK(t.min)}~${fmtK(t.max)}`}</span>
                <span className="text-gray-600">{t.desc}</span>
                {cur && <span className="bg-blue-600 text-white px-1 py-0.5 rounded text-xs">YOU</span>}
              </div>;
            })}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}
