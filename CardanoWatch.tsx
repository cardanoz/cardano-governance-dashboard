"use client";
// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from "recharts";
import { Wallet, TrendingUp, Award, Bell, Download, Plus, Trash2, Eye, EyeOff, Mail, RefreshCw, Copy, ArrowUpRight, ArrowDownRight, Star, Shield, Coins, ChevronDown, ChevronUp, Activity, Loader, Wifi, WifiOff, AlertCircle } from "lucide-react";

// ══════════════════════════════════════════════
// 35-Tier System (7 Major Tiers × 4-6 Sub-Tiers)
// ══════════════════════════════════════════════
const MAJOR_TIERS = [
  { name: "Mythical", emoji: "🏛️", color: "#FBBF24", range: "5M+" },
  { name: "Ancient", emoji: "🦴", color: "#7C3AED", range: "2M~5M" },
  { name: "Whale", emoji: "🐋", color: "#2563EB", range: "500K~2M" },
  { name: "Mid-Fish", emoji: "🐟", color: "#0891B2", range: "100K~500K" },
  { name: "Small Fish", emoji: "🐠", color: "#34D399", range: "10K~100K" },
  { name: "Crustacean", emoji: "🦐", color: "#FB923C", range: "1K~10K" },
  { name: "Plankton", emoji: "🦠", color: "#6B7280", range: "~1K" },
];

const TIERS = [
  { name: "Poseidon", emoji: "🔱", min: 10000000, max: Infinity, color: "#FFD700", desc: "God of Sea", major: 0, sub: "S+" },
  { name: "Leviathan", emoji: "🐉", min: 8000000, max: 10000000, color: "#FCD34D", desc: "Sea Monster", major: 0, sub: "S" },
  { name: "Kraken", emoji: "🦑", min: 6000000, max: 8000000, color: "#F59E0B", desc: "Abyss Lord", major: 0, sub: "A" },
  { name: "Jörmungandr", emoji: "🐍", min: 5000000, max: 6000000, color: "#D97706", desc: "World Serpent", major: 0, sub: "B" },
  { name: "Megalodon", emoji: "🦷", min: 4000000, max: 5000000, color: "#8B5CF6", desc: "Ancient Giant Shark", major: 1, sub: "S" },
  { name: "Dunkleosteus", emoji: "🛡️", min: 3500000, max: 4000000, color: "#7C3AED", desc: "Armored Fish", major: 1, sub: "A" },
  { name: "Leedsichthys", emoji: "🐋", min: 2500000, max: 3500000, color: "#6D28D9", desc: "Largest Bony Fish", major: 1, sub: "B" },
  { name: "Basilosaurus", emoji: "🦕", min: 2000000, max: 2500000, color: "#5B21B6", desc: "Ancient Whale", major: 1, sub: "C" },
  { name: "Blue Whale", emoji: "🐳", min: 1500000, max: 2000000, color: "#3B82F6", desc: "Blue Whale", major: 2, sub: "S" },
  { name: "Sperm Whale", emoji: "🐋", min: 1000000, max: 1500000, color: "#2563EB", desc: "Sperm Whale", major: 2, sub: "A" },
  { name: "Humpback", emoji: "🐋", min: 800000, max: 1000000, color: "#1D4ED8", desc: "Humpback", major: 2, sub: "B" },
  { name: "Whale Shark", emoji: "🦈", min: 650000, max: 800000, color: "#1E40AF", desc: "Whale Shark", major: 2, sub: "C" },
  { name: "Great White", emoji: "🦈", min: 500000, max: 650000, color: "#1E3A8A", desc: "Great White", major: 2, sub: "D" },
  { name: "Tuna", emoji: "🐟", min: 400000, max: 500000, color: "#06B6D4", desc: "Tuna", major: 3, sub: "S" },
  { name: "Marlin", emoji: "⚔️", min: 300000, max: 400000, color: "#0891B2", desc: "Marlin", major: 3, sub: "A" },
  { name: "Barracuda", emoji: "🐡", min: 200000, max: 300000, color: "#0E7490", desc: "Barracuda", major: 3, sub: "B" },
  { name: "Salmon", emoji: "🍣", min: 150000, max: 200000, color: "#155E75", desc: "Salmon", major: 3, sub: "C" },
  { name: "Sea Bream", emoji: "🐡", min: 120000, max: 150000, color: "#164E63", desc: "Sea Bream", major: 3, sub: "D" },
  { name: "Horse Mackerel", emoji: "🐟", min: 100000, max: 120000, color: "#134E4A", desc: "Horse Mackerel", major: 3, sub: "E" },
  { name: "Clownfish", emoji: "🐠", min: 70000, max: 100000, color: "#34D399", desc: "Clownfish", major: 4, sub: "S" },
  { name: "Neon Tetra", emoji: "💎", min: 50000, max: 70000, color: "#10B981", desc: "Neon Tetra", major: 4, sub: "A" },
  { name: "Seahorse", emoji: "🐴", min: 30000, max: 50000, color: "#059669", desc: "Seahorse", major: 4, sub: "B" },
  { name: "Killifish", emoji: "🐟", min: 20000, max: 30000, color: "#047857", desc: "Killifish", major: 4, sub: "C" },
  { name: "Guppy", emoji: "🐟", min: 10000, max: 20000, color: "#065F46", desc: "Guppy", major: 4, sub: "D" },
  { name: "Lobster", emoji: "🦞", min: 7000, max: 10000, color: "#F97316", desc: "Lobster", major: 5, sub: "S" },
  { name: "Crab", emoji: "🦀", min: 5000, max: 7000, color: "#EA580C", desc: "Crab", major: 5, sub: "A" },
  { name: "Shrimp", emoji: "🦐", min: 3000, max: 5000, color: "#DC2626", desc: "Shrimp", major: 5, sub: "B" },
  { name: "Hermit Crab", emoji: "🐚", min: 2000, max: 3000, color: "#B91C1C", desc: "Hermit Crab", major: 5, sub: "C" },
  { name: "Barnacle", emoji: "🪨", min: 1000, max: 2000, color: "#991B1B", desc: "Barnacle", major: 5, sub: "D" },
  { name: "Krill", emoji: "🦐", min: 500, max: 1000, color: "#9CA3AF", desc: "Krill", major: 6, sub: "S" },
  { name: "Daphnia", emoji: "🔍", min: 200, max: 500, color: "#6B7280", desc: "Daphnia", major: 6, sub: "A" },
  { name: "Plankton", emoji: "🫧", min: 50, max: 200, color: "#4B5563", desc: "Plankton", major: 6, sub: "B" },
  { name: "Amoeba", emoji: "🔬", min: 10, max: 50, color: "#374151", desc: "Amoeba", major: 6, sub: "C" },
  { name: "Bacteria", emoji: "🧫", min: 1, max: 10, color: "#1F2937", desc: "Bacteria", major: 6, sub: "D" },
  { name: "Virus", emoji: "🧬", min: 0, max: 1, color: "#111827", desc: "Virus", major: 6, sub: "E" },
];

const getTier = (a) => TIERS.find(t => a >= t.min && a < t.max) || TIERS[TIERS.length - 1];
const getNextTier = (a) => { const i = TIERS.findIndex(t => a >= t.min && a < t.max); return i > 0 ? TIERS[i - 1] : null; };
const fmt = (n, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fmtK = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : `${n}`;
const fmtPrice = (v) => {
  if (v === undefined || v === null) return '—';
  if (v >= 10000) return `$${Math.round(v).toLocaleString()}`;
  if (v >= 100) return `$${v.toFixed(1)}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
};

// ══════════════════════════════════════════════
// CoinGecko API Integration + Mock Fallback
// ══════════════════════════════════════════════
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_IDS = { ADA: "cardano", BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", GOLD: "pax-gold" };
const CG_SUPPLY = { ADA: 35e9, BTC: 19.8e6, ETH: 120.4e6, SOL: 430e6, XRP: 55e9, GOLD: 5.3e6 };

async function fetchJpyRate(cgKey) {
  try {
    const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
    const url = `${CG_BASE}/simple/price?ids=usd-coin&vs_currencies=jpy${keyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.["usd-coin"]?.jpy || null;
  } catch { return null; }
}

async function fetchMarkets(jpyRate, cgKey) {
  const ids = Object.values(CG_IDS).join(",");
  const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
  const url = `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_7d_change=true&include_30d_change=true${keyParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko fetch failed: ${res.status}`);
  const data = await res.json();
  const P = {}, PC = {}, HL = {};
  for (const [key, id] of Object.entries(CG_IDS)) {
    const item = data[id] || {};
    const usd = item.usd || 0;
    P[key] = { usd, jpy: usd * jpyRate, btc: (item.usd || 0) / (data.bitcoin?.usd || 66200), mcap: item.usd_market_cap || 0 };
    PC[key] = { "24h": item.usd_24h_change || 0, "7d": item.usd_7d_change || 0, "1m": null, "3m": null, "6m": null, "1y": null };
    HL[key] = { "24h": { hi: usd * 1.01, lo: usd * 0.99 }, "7d": null, "1m": null, "all": null };
  }
  return { P, PC, HL };
}

async function fetchHistory(id, cgKey) {
  const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
  const url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily${keyParam}`;
  const res = await fetch(url);
  if (!res.status === 429) throw new Error("Rate limited");
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.prices || []).map(([ts, price], i) => {
    const date = new Date(ts).toISOString().split("T")[0];
    const mcap = data.market_caps?.[i]?.[1] || null;
    return { date, price, mcap };
  });
}

async function fetchACWI(avKey) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=ACWX&apikey=${avKey}&outputsize=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ACWI fetch failed");
  const data = await res.json();
  const ts = data["Time Series (Daily)"] || {};
  return Object.entries(ts).slice(0, 90).reverse().map(([date, vals]) => ({
    date,
    price: parseFloat(vals["4. close"]),
  }));
}

const MOCK_P = { ADA: { usd: 0.277, jpy: 43.3, btc: 0.00000418, mcap: 9700000000 }, BTC: { usd: 66200, jpy: 10346460, btc: 1, mcap: 1310760000000 }, ETH: { usd: 1994, jpy: 311660, btc: 0.03012, mcap: 239280000000 }, SOL: { usd: 84.4, jpy: 13191, btc: 0.001275, mcap: 36292000000 }, XRP: { usd: 1.35, jpy: 211, btc: 0.0000204, mcap: 74250000000 }, GOLD: { usd: 5380, jpy: 840894, btc: 0.08126, mcap: 28514000000 } };
const MOCK_PC = { ADA: { "24h": -6.0, "7d": -18.5, "1m": -32.1, "3m": -45.2, "6m": -62.0, "1y": -58.3 }, BTC: { "24h": 2.1, "7d": -8.3, "1m": 15.2, "3m": 22.5, "6m": 35.1, "1y": 120.3 }, ETH: { "24h": -1.5, "7d": -12.1, "1m": 5.3, "3m": 18.7, "6m": 28.5, "1y": 98.2 }, SOL: { "24h": 3.2, "7d": -5.6, "1m": 22.1, "3m": 35.6, "6m": 52.3, "1y": 185.7 }, XRP: { "24h": -2.1, "7d": -15.3, "1m": 8.9, "3m": 25.3, "6m": 42.1, "1y": 75.8 }, GOLD: { "24h": 0.5, "7d": 2.1, "1m": 3.5, "3m": 5.2, "6m": 8.1, "1y": 12.3 } };
const MOCK_HL = { ADA: { "24h": { hi: 0.285, lo: 0.269 }, "7d": { hi: 0.305, lo: 0.263 }, "1m": { hi: 0.410, lo: 0.265 }, "all": { hi: 1.2, lo: 0.15 } }, BTC: { "24h": { hi: 67800, lo: 65100 }, "7d": { hi: 72100, lo: 64500 }, "1m": { hi: 75200, lo: 63800 }, "all": { hi: 108000, lo: 15000 } }, ETH: { "24h": { hi: 2040, lo: 1950 }, "7d": { hi: 2150, lo: 1890 }, "1m": { hi: 2350, lo: 1850 }, "all": { hi: 4890, lo: 400 } }, SOL: { "24h": { hi: 87, lo: 82 }, "7d": { hi: 92, lo: 80 }, "1m": { hi: 105, lo: 78 }, "all": { hi: 260, lo: 8 } }, XRP: { "24h": { hi: 1.38, lo: 1.32 }, "7d": { hi: 1.50, lo: 1.28 }, "1m": { hi: 1.68, lo: 1.25 }, "all": { hi: 3.84, lo: 0.17 } }, GOLD: { "24h": { hi: 5420, lo: 5340 }, "7d": { hi: 5580, lo: 5200 }, "1m": { hi: 5890, lo: 5150 }, "all": { hi: 8500, lo: 900 } } };

const DEMO_WALLETS = [
  { id: "demo-1", name: "Demo Wallet", stake: "stake1u9sample1234567890...", addr: "addr1vxsample1234567890...", bal: 150000, pool: "FORGE", poolId: "", poolName: "", poolInfo: null, poolHistory: [], drep: "DRep Demo", drepId: "", rew: 500, cat: 100, tokens: {}, allAssets: [], rewards: [], active: true },
];

const CHANGE_PERIODS = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "1m", label: "1m" },
  { key: "3m", label: "3m" },
  { key: "6m", label: "6m" },
  { key: "1y", label: "1y" },
];

const Btn = ({ active, onClick, children, color }) => (
  <button onClick={onClick} className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${active ? "bg-white/20 border border-white/50" : "bg-gray-700 border border-gray-600 hover:bg-gray-600"}`} style={active ? { borderColor: color, backgroundColor: color + "30" } : {}}>{children}</button>
);

const Section = ({ title, icon, rightEl, children }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
    <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2"><span className="text-gray-400">{icon}</span><span className="text-sm font-bold text-gray-200">{title}</span></div>
      {rightEl}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const PeriodBtns = ({ value, onChange }) => (
  <div className="flex items-center gap-1">{CHANGE_PERIODS.map(p => <Btn key={p.key} active={value === p.key} onClick={() => onChange(p.key)} color="#6366F1">{p.label}</Btn>)}</div>
);

const StatusBadge = ({ isLive, label }) => (
  <span className={`text-xs font-medium px-2 py-0.5 rounded ${isLive ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-orange-900/50 text-orange-400 border border-orange-800"}`}>{label}</span>
);

// ══════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════
export default function ADADashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL || "/api";
  const CG_KEY = process.env.NEXT_PUBLIC_CG_KEY || "";

  // Persist to localStorage
  const saveLS = (obj) => Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  const saved = {
    wallets: JSON.parse(localStorage.getItem("wallets") || "[]"),
    manual: JSON.parse(localStorage.getItem("manual") || "[]"),
    email: JSON.parse(localStorage.getItem("email") || '""'),
    alerts: JSON.parse(localStorage.getItem("alerts") || '{"pool":true,"pledge":true,"margin":false,"blocks":false,"drep":false}'),
    jpyRate: JSON.parse(localStorage.getItem("jpyRate") || "150"),
    chartUnit: JSON.parse(localStorage.getItem("chartUnit") || '"usd"'),
    csvCurrency: JSON.parse(localStorage.getItem("csvCurrency") || '"jpy"'),
    csvTimezone: JSON.parse(localStorage.getItem("csvTimezone") || '"JST"'),
    csvRewardSplit: JSON.parse(localStorage.getItem("csvRewardSplit") || "false"),
  };

  // Core state
  const [wallets, setWallets] = useState(saved.wallets);
  const [manual, setManual] = useState(saved.manual);
  const [email, setEmail] = useState(saved.email);
  const [alerts, setAlerts] = useState(saved.alerts);
  const [jpyRate, setJpyRate] = useState(saved.jpyRate);
  const [hide, setHide] = useState(false);
  const [alertStatus, setAlertStatus] = useState("default");
  const [emailSaved, setEmailSaved] = useState(false);
  const [poolAlerts, setPoolAlerts] = useState([]);
  const [showDemo, setShowDemo] = useState(wallets.length === 0);

  useEffect(() => { saveLS({ wallets }); }, [wallets]);
  useEffect(() => { saveLS({ manual }); }, [manual]);
  useEffect(() => { saveLS({ email }); }, [email]);
  useEffect(() => { saveLS({ alerts }); }, [alerts]);
  useEffect(() => { saveLS({ jpyRate }); }, [jpyRate]);

  // Prices
  const [liveP, setLiveP] = useState(null);
  const [livePC, setLivePC] = useState(null);
  const [liveHL, setLiveHL] = useState(null);
  const [liveHist, setLiveHist] = useState(null);
  const [apiStatus, setApiStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [lastFetch, setLastFetch] = useState(null);
  const [dataSource, setDataSource] = useState({ prices: "mock", history: "mock" });

  const P = liveP || MOCK_P;
  const PC = livePC || MOCK_PC;
  const PRICE_HL = liveHL || MOCK_HL;
  const COMBINED_HIST = liveHist || null;
  const isLive = !!liveP;
  const isHistLive = !!liveHist;

  // Fetch prices
  const fetchAllData = useCallback(async () => {
    setApiStatus("loading");
    setApiError("");
    try {
      let effectiveJpyRate = jpyRate;
      try {
        const autoJpy = await fetchJpyRate(CG_KEY);
        if (autoJpy && autoJpy > 100 && autoJpy < 300) {
          effectiveJpyRate = Math.round(autoJpy * 10) / 10;
          setJpyRate(effectiveJpyRate);
        }
      } catch (e) {}

      const { P: newP, PC: newPC, HL: newHL } = await fetchMarkets(effectiveJpyRate, CG_KEY);
      setLiveP(newP);
      setLivePC(newPC);
      setLiveHL(newHL);
      setDataSource(prev => ({ ...prev, prices: "live" }));

      const histMap = {};
      for (const [key, id] of Object.entries(CG_IDS)) {
        try {
          const h = await fetchHistory(id, CG_KEY);
          if (h && h.length > 0) histMap[key] = h;
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          console.warn(`${key} history failed`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (Object.keys(histMap).length > 0) {
        const combined = histMap.ADA.map((adaPt, i) => {
          const date = adaPt.date;
          const btcPrice = histMap.BTC?.[i]?.price || 66200;
          const ethPrice = histMap.ETH?.[i]?.price || 2800;
          const solPrice = histMap.SOL?.[i]?.price || 140;
          const xrpPrice = histMap.XRP?.[i]?.price || 2.1;
          const goldPrice = histMap.GOLD?.[i]?.price || 2850;
          return { date, pADA: adaPt.price, btcPrice, ethPrice, solPrice, xrpPrice, goldPrice, mcADA: adaPt.mcap || adaPt.price * CG_SUPPLY.ADA };
        });
        setLiveHist(combined);
        setDataSource(prev => ({ ...prev, history: "live" }));
      }

      setApiStatus("ok");
      setLastFetch(new Date());
    } catch (e) {
      console.error("API fetch failed:", e);
      setApiStatus("error");
      setApiError(e.message || "API fetch failed");
    }
  }, [jpyRate, CG_KEY]);

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    if ('Notification' in window) setAlertStatus(Notification.permission);
  }, []);

  // Wallet functions
  const [newAddr, setNewAddr] = useState("");
  const [newName, setNewName] = useState("");
  const [dbSyncStatus, setDbSyncStatus] = useState("idle");
  const [dbSyncError, setDbSyncError] = useState("");

  const addWallet = useCallback(async () => {
    const addr = newAddr.trim();
    if (!addr) return;
    setDbSyncStatus("loading");
    setDbSyncError("");
    try {
      let stakeAddr = addr;
      if (addr.startsWith("addr1")) {
        const res = await fetch(`${API}/address-to-stake/${addr}`);
        if (!res.ok) throw new Error("Could not resolve address");
        const data = await res.json();
        stakeAddr = data.stake_address;
      }

      if (wallets.find(w => w.stake === stakeAddr)) {
        throw new Error("Wallet already registered");
      }

      const res = await fetch(`${API}/wallet/${stakeAddr}`);
      if (!res.ok) throw new Error("Wallet not found");
      const data = await res.json();

      const tokensRes = await fetch(`${API}/address/${stakeAddr}/tokens`);
      const tokens = tokensRes.ok ? await tokensRes.json() : [];
      const tokenMap = {};
      tokens.forEach(t => { tokenMap[t.asset_name || `${t.policy_id.slice(0,8)}...`] = t.quantity; });

      const w = {
        id: stakeAddr,
        name: newName || stakeAddr.slice(0, 12) + "...",
        stake: stakeAddr,
        addr: addr.startsWith("addr") ? addr : "—",
        bal: data.balance_ada || 0,
        pool: data.pool_ticker || "—",
        poolId: data.pool_hash || "",
        poolName: "",
        poolInfo: null,
        poolHistory: [],
        drep: data.drep_id || "—",
        drepId: data.drep_id || "",
        rew: data.total_rewards_ada || 0,
        cat: 0,
        tokens: tokenMap,
        allAssets: tokens,
        rewards: data.rewards || [],
        active: true,
      };
      setWallets(prev => [...prev, w]);
      setShowDemo(false);
      setNewAddr("");
      setNewName("");
      setDbSyncStatus("ok");
    } catch (e) {
      setDbSyncStatus("error");
      setDbSyncError(e.message);
    }
  }, [newAddr, newName, wallets, API]);

  const removeWallet = (id) => setWallets(wallets.filter(w => w.id !== id));

  const [mName, setMName] = useState("");
  const [mAmt, setMAmt] = useState("");
  const addManual = () => {
    if (mName && mAmt) {
      setManual([...manual, { id: Date.now(), name: mName, amount: +mAmt || 0 }]);
      setMName("");
      setMAmt("");
    }
  };

  // Alert checking
  const checkAlerts = useCallback(() => {
    const detected = [];
    for (const w of wallets) {
      if (alerts.pool && w.poolInfo?.retiring) {
        detected.push({ severity: "warn", msg: `[${w.name}] Pool ${w.pool} retiring at epoch ${w.poolInfo.retiring}` });
      }
      if (alerts.pledge && w.poolInfo?.livePledge && w.poolInfo.declaredPledge && w.poolInfo.livePledge < w.poolInfo.declaredPledge * 0.9) {
        detected.push({ severity: "warn", msg: `[${w.name}] Pool pledge below declared (${w.poolInfo.livePledge.toFixed(0)} < ${w.poolInfo.declaredPledge.toFixed(0)})` });
      }
      if (alerts.drep && w.drep === "—") {
        detected.push({ severity: "info", msg: `[${w.name}] DRep not set` });
      }
    }
    setPoolAlerts(detected);
    if (alertStatus === "granted" && detected.length > 0) {
      new Notification("Cardano Alerts", { body: `${detected.length} alert(s) detected` });
    }
  }, [wallets, alerts, alertStatus]);

  // Chart state
  const [chartUnit, setChartUnit] = useState(saved.chartUnit);
  const [chartAssets, setChartAssets] = useState({ ADA: true, TOTAL: true });
  const [balPeriod, setBalPeriod] = useState("all");
  const [showPriceOverlay, setShowPriceOverlay] = useState({ adaPrice: true, btcPrice: false, ethPrice: false, solPrice: false, xrpPrice: false, goldPrice: false });
  const [priceMode, setPriceMode] = useState("indexed");
  const [pricePeriod, setPricePeriod] = useState("all");
  const [baseIdx, setBaseIdx] = useState(0);

  // Table toggles
  const [visiblePeriods, setVisiblePeriods] = useState({ "24h": true, "7d": false, "1m": false, "3m": false, "6m": false, "1y": false });
  const [visibleCols, setVisibleCols] = useState({ amt: true, usd: true, btc: false, jpy: true, tier: false, nextTier: false, rank: false, pct: false, hl: false });
  const [hlPeriod, setHlPeriod] = useState("24h");
  const [showZeroUsd, setShowZeroUsd] = useState(false);

  // CSV export
  const [csvCurrency, setCsvCurrency] = useState(saved.csvCurrency);
  const [csvTimezone, setCsvTimezone] = useState(saved.csvTimezone);
  const [csvRewardSplit, setCsvRewardSplit] = useState(saved.csvRewardSplit);

  useEffect(() => { saveLS({ chartUnit }); }, [chartUnit]);
  useEffect(() => { saveLS({ csvCurrency }); }, [csvCurrency]);
  useEffect(() => { saveLS({ csvTimezone }); }, [csvTimezone]);
  useEffect(() => { saveLS({ csvRewardSplit }); }, [csvRewardSplit]);

  // Computed values
  const totalAda = useMemo(() => wallets.reduce((s, w) => s + w.bal, 0) + manual.reduce((s, e) => s + e.amount, 0), [wallets, manual]);
  const tier = getTier(totalAda);
  const next = getNextTier(totalAda);
  const totalRew = wallets.reduce((s, w) => s + w.rew, 0);
  const totalCat = wallets.reduce((s, w) => s + w.cat, 0);
  const H = (v) => hide ? "•••••" : v;
  const usd = totalAda * P.ADA.usd, jpy = totalAda * P.ADA.jpy, btc = totalAda * P.ADA.btc;

  const filterByPeriod = (data, period) => {
    if (period === "all") return data;
    const days = { "24h": 1, "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 }[period] || 365;
    return data.slice(-days);
  };

  // Price chart data
  const priceFiltered = useMemo(() => COMBINED_HIST ? filterByPeriod(COMBINED_HIST, pricePeriod) : [], [pricePeriod, COMBINED_HIST]);
  const safeBaseIdx = Math.max(0, Math.min(baseIdx, priceFiltered.length - 1));
  const priceChartData = useMemo(() => {
    if (priceFiltered.length === 0) return [];
    const basePrice = { adaPrice: priceFiltered[safeBaseIdx]?.pADA || 1, btcPrice: priceFiltered[safeBaseIdx]?.btcPrice || 66200, ethPrice: priceFiltered[safeBaseIdx]?.ethPrice || 2800, solPrice: priceFiltered[safeBaseIdx]?.solPrice || 140, xrpPrice: priceFiltered[safeBaseIdx]?.xrpPrice || 2.1, goldPrice: priceFiltered[safeBaseIdx]?.goldPrice || 2850 };
    return priceFiltered.map((row) => {
      const entry = { date: row.date };
      if (priceMode === "price") {
        entry.adaPrice = row.pADA; entry.btcPrice = row.btcPrice; entry.ethPrice = row.ethPrice; entry.solPrice = row.solPrice; entry.xrpPrice = row.xrpPrice; entry.goldPrice = row.goldPrice;
      } else if (priceMode === "mcap") {
        entry.adaPrice = (row.mcADA || row.pADA * CG_SUPPLY.ADA) / 1e9;
      } else {
        entry.adaPrice = (row.pADA / basePrice.adaPrice) * 100; entry.btcPrice = (row.btcPrice / basePrice.btcPrice) * 100; entry.ethPrice = (row.ethPrice / basePrice.ethPrice) * 100; entry.solPrice = (row.solPrice / basePrice.solPrice) * 100; entry.xrpPrice = (row.xrpPrice / basePrice.xrpPrice) * 100; entry.goldPrice = (row.goldPrice / basePrice.goldPrice) * 100;
      }
      return entry;
    });
  }, [priceMode, pricePeriod, safeBaseIdx, priceFiltered]);

  const balChartData = useMemo(() => {
    if (!COMBINED_HIST) return [];
    return filterByPeriod(COMBINED_HIST, balPeriod).map(row => ({
      date: row.date,
      ADA: chartUnit === "usd" ? row.pADA : chartUnit === "jpy" ? row.pADA * jpyRate : chartUnit === "btc" ? row.pADA / row.btcPrice : row.pADA,
      TOTAL: chartUnit === "usd" ? row.pADA : chartUnit === "jpy" ? row.pADA * jpyRate : chartUnit === "btc" ? row.pADA / row.btcPrice : row.pADA,
    }));
  }, [chartUnit, balPeriod, COMBINED_HIST, jpyRate]);

  const rewardData = useMemo(() => {
    const epochs = {};
    for (const w of wallets) {
      if (w.rewards) {
        for (const r of w.rewards) {
          epochs[r.epoch] = (epochs[r.epoch] || 0) + r.ada;
        }
      }
    }
    return Object.entries(epochs).sort((a, b) => a[0] - b[0]).map(([ep, ada]) => ({ epoch: ep, ada: Math.round(ada) }));
  }, [wallets]);

  const exportCSV = () => {
    let csv = "Epoch,Rewards (ADA)\n";
    rewardData.forEach(r => { csv += `${r.epoch},${r.ada}\n`; });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rewards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const requestNotification = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(perm => setAlertStatus(perm));
    }
  };

  // ══════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter','Noto Sans JP',system-ui,sans-serif" }}>
      <div className="max-w-7xl mx-auto p-1.5 sm:p-3 space-y-2 sm:space-y-3">

        {/* ═══ Price Comparison (Always First) ═══ */}
        <div className="relative">
          {showDemo && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center"><div className="text-center"><div className="text-xl font-bold mb-2">DEMO MODE</div><div className="text-sm text-gray-400">Add a wallet to see live data</div></div></div>}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-2 sm:p-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2"><Activity size={14} className="text-purple-400"/><span className="text-xs font-bold text-gray-300">Price Comparison</span><StatusBadge isLive={isHistLive} label={isHistLive ? "LIVE" : "MOCK"}/></div>
              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                <PeriodBtns value={pricePeriod} onChange={setPricePeriod}/>
                <div className="w-px h-4 bg-gray-700"/>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 mr-1">Mode:</span>
                  {[{k:"indexed",l:"Indexed"},{k:"mcap",l:"Market Cap"},{k:"price",l:"Price"}].map(m => (<Btn key={m.k} active={priceMode===m.k} onClick={()=>setPriceMode(m.k)} color="#A855F7">{m.l}</Btn>))}
                </div>
                <div className="w-px h-4 bg-gray-700"/>
                <div className="flex items-center gap-1 flex-wrap">
                  {[{k:"adaPrice",l:"ADA",c:"#818CF8"},{k:"btcPrice",l:"BTC",c:"#FB923C"},{k:"ethPrice",l:"ETH",c:"#627EEA"},{k:"solPrice",l:"SOL",c:"#00FFA3"},{k:"xrpPrice",l:"XRP",c:"#A8B8C8"},{k:"goldPrice",l:"Gold",c:"#FFD700"}].map(c => (<Btn key={c.k} active={showPriceOverlay[c.k]} onClick={()=>setShowPriceOverlay({...showPriceOverlay,[c.k]:!showPriceOverlay[c.k]})} color={c.c}>{c.l}</Btn>))}
                </div>
              </div>
            </div>
            {priceChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                <Activity size={20} className="mb-2 text-gray-600"/>
                <span className="text-sm">No price history data</span>
              </div>
            ) : <>
              {priceMode === "indexed" && (
                <div className="flex items-center gap-1.5 sm:gap-3 mb-2 px-1 flex-wrap">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Base Date:</span>
                  <span className="text-xs text-white font-bold bg-purple-600/30 border border-purple-500/50 px-2 py-0.5 rounded whitespace-nowrap">{priceFiltered[safeBaseIdx]?.date || "—"} = 100</span>
                  <input type="range" min={0} max={priceFiltered.length - 1} value={safeBaseIdx} onChange={e => setBaseIdx(+e.target.value)} className="flex-1 h-1 accent-purple-500 cursor-pointer" style={{accentColor: "#A855F7"}}/>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setBaseIdx(0)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">Start</button>
                    <button onClick={() => setBaseIdx(Math.floor(priceFiltered.length / 2))} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">Mid</button>
                    <button onClick={() => setBaseIdx(priceFiltered.length - 1)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">Latest</button>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
                  <XAxis dataKey="date" tick={{fill:"#6B7280",fontSize:9}} tickLine={false} interval={Math.max(1,Math.floor(priceChartData.length/8))}/>
                  <YAxis tick={{fill:"#6B7280",fontSize:9}} tickLine={false} tickFormatter={v => {
                    if (priceMode === "indexed") return `${v >= 100 ? "+" : ""}${(v - 100).toFixed(0)}%`;
                    if (priceMode === "mcap") return v >= 1000 ? `$${(v/1000).toFixed(1)}T` : `$${v.toFixed(0)}B`;
                    return v >= 10000 ? `$${(v/1000).toFixed(0)}k` : v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(4)}`;
                  }} width={55}/>
                  {priceMode === "indexed" && <ReferenceLine y={100} stroke="#6366F1" strokeDasharray="4 4" label={{value:"Base", fill:"#6366F1", fontSize:9, position:"insideTopRight"}}/>}
                  <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v, name) => {
                    const lbl = {adaPrice:"ADA",btcPrice:"BTC",ethPrice:"ETH",solPrice:"SOL",xrpPrice:"XRP",goldPrice:"Gold"}[name]||name;
                    if (priceMode === "indexed") { const chg = v - 100; const sign = chg >= 0 ? "+" : ""; return [`${sign}${chg.toFixed(1)}%`, lbl]; }
                    if (priceMode === "mcap") return [`$${fmt(v, 1)}B`, `${lbl} Market Cap`];
                    return [`$${v >= 1 ? fmt(v, 2) : v.toFixed(6)}`, lbl];
                  }}/>
                  {showPriceOverlay.adaPrice && <Line type="monotone" dataKey="adaPrice" stroke="#818CF8" strokeWidth={2} dot={false}/>}
                  {showPriceOverlay.btcPrice && <Line type="monotone" dataKey="btcPrice" stroke="#FB923C" strokeWidth={2} dot={false}/>}
                  {showPriceOverlay.ethPrice && <Line type="monotone" dataKey="ethPrice" stroke="#627EEA" strokeWidth={2} dot={false}/>}
                  {showPriceOverlay.solPrice && <Line type="monotone" dataKey="solPrice" stroke="#00FFA3" strokeWidth={2} dot={false}/>}
                  {showPriceOverlay.xrpPrice && <Line type="monotone" dataKey="xrpPrice" stroke="#A8B8C8" strokeWidth={2} dot={false}/>}
                  {showPriceOverlay.goldPrice && <Line type="monotone" dataKey="goldPrice" stroke="#FFD700" strokeWidth={2} dot={false}/>}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                {showPriceOverlay.adaPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#818CF8"}}/>ADA</span>}
                {showPriceOverlay.btcPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FB923C"}}/>BTC</span>}
                {showPriceOverlay.ethPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#627EEA"}}/>ETH</span>}
                {showPriceOverlay.solPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#00FFA3"}}/>SOL</span>}
                {showPriceOverlay.xrpPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#A8B8C8"}}/>XRP</span>}
                {showPriceOverlay.goldPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FFD700"}}/>Gold</span>}
              </div>
            </>}
          </div>
        </div>

        {/* ═══ Asset Table ═══ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">Change Period:</span>
                {CHANGE_PERIODS.map(p => (<Btn key={p.key} active={visiblePeriods[p.key]} onClick={() => setVisiblePeriods({...visiblePeriods, [p.key]: !visiblePeriods[p.key]})} color="#4B5563">{p.label}</Btn>))}
              </div>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">Columns:</span>
                {[{key:"amt",label:"Holdings"},{key:"usd",label:"USD"},{key:"btc",label:"BTC"},{key:"jpy",label:"JPY"},{key:"tier",label:"Tier"},{key:"hl",label:"H/L"}].map(c => (<Btn key={c.key} active={visibleCols[c.key]} onClick={() => setVisibleCols({...visibleCols, [c.key]: !visibleCols[c.key]})} color="#4B5563">{c.label}</Btn>))}
              </div>
              <div className="w-px h-4 bg-gray-700"/>
              <Btn active={showZeroUsd} onClick={()=>setShowZeroUsd(!showZeroUsd)} color="#EF4444">Show $0</Btn>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                <th className="pb-1.5 font-medium">Asset</th>
                {Object.keys(visiblePeriods).filter(k => visiblePeriods[k]).map(p => <th key={p} className="pb-1.5 font-medium text-right">{p}</th>)}
                {visibleCols.amt && <th className="pb-1.5 font-medium text-right">Holdings</th>}
                {visibleCols.usd && <th className="pb-1.5 font-medium text-right">USD Value</th>}
                {visibleCols.btc && <th className="pb-1.5 font-medium text-right">BTC Value</th>}
                {visibleCols.jpy && <th className="pb-1.5 font-medium text-right">JPY Value</th>}
                {visibleCols.tier && <th className="pb-1.5 font-medium text-right">Tier</th>}
              </tr></thead>
              <tbody>
                <tr className="border-b border-gray-700/50 bg-blue-900/10">
                  <td className="py-2 font-bold text-white">ADA<StatusBadge isLive={isLive} label={isLive ? "LIVE" : "MOCK"}/></td>
                  {Object.keys(visiblePeriods).filter(k => visiblePeriods[k]).map(p => <td key={p} className="py-2 text-right">{PC.ADA?.[p] !== null ? `${PC.ADA[p] >= 0 ? "+" : ""}${PC.ADA[p]}%` : "—"}</td>)}
                  {visibleCols.amt && <td className="py-2 text-right text-white font-bold">{H(fmt(totalAda))}</td>}
                  {visibleCols.usd && <td className="py-2 text-right text-green-400">{H(`$${fmt(usd, 2)}`)}</td>}
                  {visibleCols.btc && <td className="py-2 text-right text-orange-400">{H(`₿${btc.toFixed(4)}`)}</td>}
                  {visibleCols.jpy && <td className="py-2 text-right text-yellow-400">{H(`¥${fmt(jpy)}`)}</td>}
                  {visibleCols.tier && <td className="py-2 text-right whitespace-nowrap"><span style={{color: tier.color}}>{tier.emoji} {tier.name}</span></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ Balance History ═══ */}
        {wallets.length > 0 && COMBINED_HIST && (
          <Section title="Balance History" icon={<TrendingUp size={14} className="text-blue-400"/>} rightEl={<PeriodBtns value={balPeriod} onChange={setBalPeriod}/>}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-600">Unit:</span>
              {["usd", "jpy", "ada", "btc"].map(u => <Btn key={u} active={chartUnit === u} onClick={() => setChartUnit(u)} color="#3B82F6">{u.toUpperCase()}</Btn>)}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={balChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
                <XAxis dataKey="date" tick={{fill:"#6B7280",fontSize:9}} tickLine={false} interval={Math.max(1,Math.floor(balChartData.length/8))}/>
                <YAxis tick={{fill:"#6B7280",fontSize:9}} tickLine={false} width={50}/>
                <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}}/>
                {chartAssets.ADA && <Line type="monotone" dataKey="ADA" stroke="#818CF8" strokeWidth={2} dot={false}/>}
                {chartAssets.TOTAL && <Line type="monotone" dataKey="TOTAL" stroke="#34D399" strokeWidth={2} dot={false}/>}
              </LineChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Wallets + Holdings ═══ */}
        <Section title="Holdings (Wallets + Exchanges)" icon={<Wallet size={14} className="text-blue-400"/>} rightEl={<span className="text-xs text-gray-500">{(showDemo ? DEMO_WALLETS : wallets).length}wallet · {manual.length}manual</span>}>
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mb-2">
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Wallet name (optional)" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-36"/>
            <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="Enter stake1... or addr1..." className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"/>
            <button onClick={addWallet} disabled={dbSyncStatus==="loading"} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 justify-center shrink-0">
              {dbSyncStatus==="loading" ? <><Loader size={12} className="animate-spin"/> Loading...</> : <><Plus size={12}/> Add</>}
            </button>
          </div>
          {dbSyncStatus === "error" && dbSyncError && <div className="text-xs text-red-400 mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1 flex items-center justify-between">{dbSyncError}<button onClick={()=>{setDbSyncStatus("idle");setDbSyncError("")}} className="text-red-300 hover:text-white ml-2">✕</button></div>}
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mb-2">
            <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="Exchange name" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-32"/>
            <input value={mAmt} onChange={e=>setMAmt(e.target.value)} placeholder="ADA amount" type="number" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-28"/>
            <button onClick={addManual} className="bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 justify-center shrink-0"><Plus size={12}/> Add Manual</button>
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-1 mb-3"><Shield size={10} className="text-green-500"/> All operations use local API - no external services</div>
          {(showDemo ? DEMO_WALLETS : wallets).length === 0 && manual.length === 0 && !showDemo && (
            <div className="text-center py-6 text-gray-500 border border-dashed border-gray-700 rounded-lg mb-3">
              <div className="text-lg mb-2">₳</div>
              <div className="text-sm mb-1">No wallets registered</div>
              <div className="text-xs">Enter <span className="text-blue-400 font-mono">stake1...</span> or <span className="text-blue-400 font-mono">addr1...</span></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                <th className="pb-1.5 font-medium">Type</th><th className="pb-1.5 font-medium">Name</th><th className="pb-1.5 font-medium">Balance</th><th className="pb-1.5 font-medium hidden md:table-cell">Address</th><th className="pb-1.5 font-medium hidden sm:table-cell">Pool</th><th className="pb-1.5 font-medium hidden lg:table-cell">DRep</th><th className="pb-1.5 font-medium hidden sm:table-cell">Rewards</th><th className="pb-1.5 font-medium w-8"></th>
              </tr></thead>
              <tbody>
                {(showDemo ? DEMO_WALLETS : wallets).map(w => (
                  <tr key={`w-${w.id}`} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-1.5"><span className="text-xs bg-blue-900/40 text-blue-400 px-1 py-0.5 rounded">W</span></td>
                    <td className="py-1.5 text-white font-medium text-xs">{w.name}{showDemo && <span className="text-xs text-gray-600 ml-1">(demo)</span>}</td>
                    <td className="py-1.5 text-white font-bold text-xs">{H(`₳${fmt(w.bal)}`)}</td>
                    <td className="py-1.5 text-gray-400 font-mono text-xs hidden md:table-cell"><span title={w.stake}>{w.stake.slice(0,12)}...</span><button onClick={()=>{navigator.clipboard.writeText(w.stake);}} className="text-gray-600 hover:text-gray-400 ml-1" title="Copy"><Copy size={8}/></button></td>
                    <td className="py-1.5 hidden sm:table-cell"><span className="text-blue-400 font-bold text-xs">[{w.pool}]</span></td>
                    <td className="py-1.5 text-purple-400 text-xs hidden lg:table-cell">{w.drep}</td>
                    <td className="py-1.5 text-green-400 text-xs hidden sm:table-cell">₳{fmt(w.rew, 1)}</td>
                    <td className="py-1.5">{!showDemo && <button onClick={()=>removeWallet(w.id)} className="text-red-400 hover:text-red-300"><Trash2 size={10}/></button>}</td>
                  </tr>
                ))}
                {manual.map(e => (
                  <tr key={`m-${e.id}`} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-1.5"><span className="text-xs bg-orange-900/40 text-orange-400 px-1 py-0.5 rounded">M</span></td>
                    <td className="py-1.5 text-white font-medium text-xs">{e.name}</td>
                    <td className="py-1.5 text-white font-bold text-xs">{H(`₳${fmt(e.amount)}`)}</td>
                    <td className="py-1.5 text-gray-600 hidden md:table-cell">—</td>
                    <td className="py-1.5 text-gray-600 hidden sm:table-cell">—</td>
                    <td className="py-1.5 text-gray-600 hidden lg:table-cell">—</td>
                    <td className="py-1.5 text-gray-600 hidden sm:table-cell">—</td>
                    <td className="py-1.5"><button onClick={() => setManual(manual.filter(x=>x.id!==e.id))} className="text-red-400 hover:text-red-300"><Trash2 size={10}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ═══ Rewards ═══ */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-200"><Coins size={14} className="text-green-400"/> Rewards Summary</div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportCSV} className="text-xs bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded flex items-center gap-1"><Download size={10}/> Export CSV</button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 text-xs mb-3 flex-wrap">
            <div><span className="text-gray-500">Staking:</span> <span className="text-green-400 font-bold">{H(`₳ ${fmt(totalRew,1)}`)}</span></div>
            <div><span className="text-gray-500">Catalyst:</span> <span className="text-purple-400 font-bold">{H(`₳ ${fmt(totalCat)}`)}</span></div>
            <div><span className="text-gray-500">Total:</span> <span className="text-yellow-400 font-bold">{H(`₳ ${fmt(totalRew+totalCat,1)}`)}</span> <span className="text-gray-600">({H(`$${fmt((totalRew+totalCat)*P.ADA.usd)}`)}&nbsp;/&nbsp;{H(`¥${fmt((totalRew+totalCat)*P.ADA.jpy)}`)})</span></div>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={rewardData.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
              <XAxis dataKey="epoch" tick={{fill:"#6B7280",fontSize:8}} tickLine={false}/>
              <YAxis tick={{fill:"#6B7280",fontSize:8}} tickLine={false} width={20}/>
              <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={v=>[`₳ ${v}`,"Rewards"]}/>
              <Bar dataKey="ada" fill="#10B981" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ═══ Alerts ═══ */}
        <Section title="Alerts" icon={<Bell size={14} className="text-yellow-400"/>} rightEl={<button onClick={checkAlerts} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded flex items-center gap-1"><Bell size={10}/> Check</button>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {[{ key: "pool", label: "Pool Retired Alert", desc: "Pool retirement warning" },{ key: "pledge", label: "Pledge Deficit", desc: "Pledge below declared" },{ key: "drep", label: "DRep Not Set", desc: "DRep configuration" }].map(a => (
              <div key={a.key} className="flex items-center justify-between bg-gray-950 rounded-lg px-3 py-2">
                <div><div className="text-xs font-medium text-white">{a.label}</div><div className="text-xs text-gray-600">{a.desc}</div></div>
                <div className={`w-8 h-5 rounded-full relative cursor-pointer shrink-0 ml-2 ${alerts[a.key]?"bg-blue-600":"bg-gray-700"}`} onClick={()=>setAlerts({...alerts,[a.key]:!alerts[a.key]})}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${alerts[a.key]?"left-4":"left-0.5"}`}/>
                </div>
              </div>
            ))}
          </div>
          {poolAlerts.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-400 mb-1">Alerts ({poolAlerts.length})</div>
              {poolAlerts.map((a, i) => (
                <div key={i} className="text-xs px-2 py-1.5 rounded border bg-red-900/20 border-red-800 text-red-300">
                  ⚠ {a.msg}
                </div>
              ))}
            </div>
          )}
          {poolAlerts.length === 0 && wallets.length > 0 && <div className="mt-2 text-xs text-green-400">✓ No alerts</div>}
          {alertStatus !== "granted" && (
            <div className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1.5 flex items-center justify-between">
              <span>Notifications not allowed</span>
              <button onClick={requestNotification} className="bg-yellow-600 hover:bg-yellow-500 px-2 py-0.5 rounded text-white ml-2 whitespace-nowrap">Allow</button>
            </div>
          )}
        </Section>

        <div className="text-center text-xs text-gray-700 py-2">Cardano Governance Dashboard — Live Data</div>
      </div>
    </div>
  );
}
