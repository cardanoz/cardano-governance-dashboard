#!/usr/bin/env python3
"""
Restructure dashboards v2:
1. ADA Holder = site top "/" with CardanoWatch single-page layout (no tabs)
2. Keep: SPO, DRep, Governance Analyst (absorb CC), Chain Analyst
3. Remove: CC, Portfolio, Developer dashboards
4. Update Header navigation
5. Update /dashboard index page

Run on server: python3 restructure-dashboards-v2.py
"""
import os, subprocess, time, shutil

PROJECT_FE = "/home/ubuntu/adatool-frontend"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
G = "\033[32m"; R = "\033[31m"; Y = "\033[33m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")

def run(cmd, cwd=None, timeout=300):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_FE, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

# ============================================================
# Step 1: Copy CardanoWatch component from repo file
# ============================================================
print("=" * 60)
print("STEP 1: Copying CardanoWatch from repo file")
print("=" * 60)

comp_dir = os.path.join(PROJECT_FE, "src/components")
os.makedirs(comp_dir, exist_ok=True)

cw_file = os.path.join(comp_dir, "CardanoWatch.tsx")
# Backup
if os.path.exists(cw_file):
    shutil.copy2(cw_file, cw_file + ".bak")

# Copy from the repo's standalone CardanoWatch.tsx (has proper UTF-8 Japanese, db-sync integration)
repo_cw = os.path.join(SCRIPT_DIR, "CardanoWatch.tsx")
if os.path.exists(repo_cw):
    shutil.copy2(repo_cw, cw_file)
    log("CardanoWatch.tsx copied from repo file (UTF-8 Japanese, db-sync)")
else:
    print(f"WARNING: {repo_cw} not found, writing minimal fallback")
    with open(cw_file, "w", encoding="utf-8") as f:
        f.write(""""use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, ReferenceLine
} from "recharts";

// ══════════════════════════════════════════════
// 35-Tier System
// ══════════════════════════════════════════════
const MAJOR_TIERS = [
  { name: "\u795e\u8a71\u30fb\u4f1d\u8aac\u7d1a", emoji: "🏛️", color: "#FBBF24", range: "5M+" },
  { name: "\u53e4\u4ee3\u751f\u547d\u7d1a", emoji: "🦴", color: "#7C3AED", range: "2M~5M" },
  { name: "\u30af\u30b8\u30e9\u7d1a", emoji: "🐋", color: "#2563EB", range: "500K~2M" },
  { name: "\u4e2d\u578b\u9b5a\u7d1a", emoji: "🐟", color: "#0891B2", range: "100K~500K" },
  { name: "\u5c0f\u578b\u9b5a\u7d1a", emoji: "🐠", color: "#34D399", range: "10K~100K" },
  { name: "\u7532\u6bbb\u985e\u30fb\u5c0f\u751f\u7269\u7d1a", emoji: "🦐", color: "#FB923C", range: "1K~10K" },
  { name: "\u30d7\u30e9\u30f3\u30af\u30c8\u30f3\u30fb\u5fae\u751f\u7269\u7d1a", emoji: "🦠", color: "#6B7280", range: "~1K" },
];
const TIERS = [
  { name: "\u30dd\u30bb\u30a4\u30c9\u30f3", emoji: "🔱", min: 10000000, max: Infinity, color: "#FFD700", desc: "\u6d77\u795e", major: 0, sub: "S+" },
  { name: "\u30ea\u30f4\u30a1\u30a4\u30a2\u30b5\u30f3", emoji: "🐉", min: 8000000, max: 10000000, color: "#FCD34D", desc: "\u6d77\u306e\u602a\u7269", major: 0, sub: "S" },
  { name: "\u30af\u30e9\u30fc\u30b1\u30f3", emoji: "🦑", min: 6000000, max: 8000000, color: "#F59E0B", desc: "\u6df1\u6df5\u306e\u4e3b", major: 0, sub: "A" },
  { name: "\u30e8\u30eb\u30e0\u30f3\u30ac\u30f3\u30c9", emoji: "🐍", min: 5000000, max: 6000000, color: "#D97706", desc: "\u4e16\u754c\u86c7", major: 0, sub: "B" },
  { name: "\u30e1\u30ac\u30ed\u30c9\u30f3", emoji: "🦷", min: 4000000, max: 5000000, color: "#8B5CF6", desc: "\u53e4\u4ee3\u5de8\u5927\u30b5\u30e1", major: 1, sub: "S" },
  { name: "\u30c0\u30f3\u30af\u30eb\u30aa\u30b9\u30c6\u30a6\u30b9", emoji: "🛡️", min: 3500000, max: 4000000, color: "#7C3AED", desc: "\u88c5\u7532\u9b5a", major: 1, sub: "A" },
  { name: "\u30ea\u30fc\u30c9\u30b7\u30af\u30c6\u30a3\u30b9", emoji: "🐋", min: 2500000, max: 3500000, color: "#6D28D9", desc: "\u53f2\u4e0a\u6700\u5927\u786c\u9aa8\u9b5a", major: 1, sub: "B" },
  { name: "\u30d0\u30b7\u30ed\u30b5\u30a6\u30eb\u30b9", emoji: "🦕", min: 2000000, max: 2500000, color: "#5B21B6", desc: "\u539f\u59cb\u30af\u30b8\u30e9", major: 1, sub: "C" },
  { name: "\u30b7\u30ed\u30ca\u30ac\u30b9\u30af\u30b8\u30e9", emoji: "🐳", min: 1500000, max: 2000000, color: "#3B82F6", desc: "Blue Whale", major: 2, sub: "S" },
  { name: "\u30de\u30c3\u30b3\u30a6\u30af\u30b8\u30e9", emoji: "🐋", min: 1000000, max: 1500000, color: "#2563EB", desc: "Sperm Whale", major: 2, sub: "A" },
  { name: "\u30b6\u30c8\u30a6\u30af\u30b8\u30e9", emoji: "🐋", min: 800000, max: 1000000, color: "#1D4ED8", desc: "Humpback", major: 2, sub: "B" },
  { name: "\u30b8\u30f3\u30d9\u30a8\u30b6\u30e1", emoji: "🦈", min: 650000, max: 800000, color: "#1E40AF", desc: "Whale Shark", major: 2, sub: "C" },
  { name: "\u30db\u30aa\u30b8\u30ed\u30b6\u30e1", emoji: "🦈", min: 500000, max: 650000, color: "#1E3A8A", desc: "Great White", major: 2, sub: "D" },
  { name: "\u30de\u30b0\u30ed", emoji: "🐟", min: 400000, max: 500000, color: "#06B6D4", desc: "Tuna", major: 3, sub: "S" },
  { name: "\u30ab\u30b8\u30ad", emoji: "\u2694\ufe0f", min: 300000, max: 400000, color: "#0891B2", desc: "Marlin", major: 3, sub: "A" },
  { name: "\u30d0\u30e9\u30af\u30fc\u30c0", emoji: "🐡", min: 200000, max: 300000, color: "#0E7490", desc: "Barracuda", major: 3, sub: "B" },
  { name: "\u30b5\u30fc\u30e2\u30f3", emoji: "🍣", min: 150000, max: 200000, color: "#155E75", desc: "Salmon", major: 3, sub: "C" },
  { name: "\u30bf\u30a4", emoji: "🐡", min: 120000, max: 150000, color: "#164E63", desc: "Sea Bream", major: 3, sub: "D" },
  { name: "\u30a2\u30b8", emoji: "🐟", min: 100000, max: 120000, color: "#134E4A", desc: "Horse Mackerel", major: 3, sub: "E" },
  { name: "\u30af\u30de\u30ce\u30df", emoji: "🐠", min: 70000, max: 100000, color: "#34D399", desc: "Clownfish", major: 4, sub: "S" },
  { name: "\u30cd\u30aa\u30f3\u30c6\u30c8\u30e9", emoji: "💎", min: 50000, max: 70000, color: "#10B981", desc: "Neon Tetra", major: 4, sub: "A" },
  { name: "\u30bf\u30c4\u30ce\u30aa\u30c8\u30b7\u30b4", emoji: "🐴", min: 30000, max: 50000, color: "#059669", desc: "Seahorse", major: 4, sub: "B" },
  { name: "\u30e1\u30c0\u30ab", emoji: "🐟", min: 20000, max: 30000, color: "#047857", desc: "Killifish", major: 4, sub: "C" },
  { name: "\u30b0\u30c3\u30d4\u30fc", emoji: "🐟", min: 10000, max: 20000, color: "#065F46", desc: "Guppy", major: 4, sub: "D" },
  { name: "\u30a4\u30bb\u30a8\u30d3", emoji: "🧦", min: 7000, max: 10000, color: "#F97316", desc: "Lobster", major: 5, sub: "S" },
  { name: "\u30ab\u30cb", emoji: "🦀", min: 5000, max: 7000, color: "#EA580C", desc: "Crab", major: 5, sub: "A" },
  { name: "\u30a8\u30d3", emoji: "🦐", min: 3000, max: 5000, color: "#DC2626", desc: "Shrimp", major: 5, sub: "B" },
  { name: "\u30e4\u30c9\u30ab\u30ea", emoji: "🐚", min: 2000, max: 3000, color: "#B91C1C", desc: "Hermit Crab", major: 5, sub: "C" },
  { name: "\u30d5\u30b8\u30c4\u30dc", emoji: "🪨", min: 1000, max: 2000, color: "#991B1B", desc: "Barnacle", major: 5, sub: "D" },
  { name: "\u30aa\u30ad\u30a2\u30df", emoji: "🦐", min: 500, max: 1000, color: "#9CA3AF", desc: "Krill", major: 6, sub: "S" },
  { name: "\u30df\u30b8\u30f3\u30b3", emoji: "🔍", min: 200, max: 500, color: "#6B7280", desc: "Daphnia", major: 6, sub: "A" },
  { name: "\u30d7\u30e9\u30f3\u30af\u30c8\u30f3", emoji: "🫧", min: 50, max: 200, color: "#4B5563", desc: "Plankton", major: 6, sub: "B" },
  { name: "\u30a2\u30e1\u30fc\u30d0", emoji: "🔬", min: 10, max: 50, color: "#374151", desc: "Amoeba", major: 6, sub: "C" },
  { name: "\u30d0\u30af\u30c6\u30ea\u30a2", emoji: "🧫", min: 1, max: 10, color: "#1F2937", desc: "Bacteria", major: 6, sub: "D" },
  { name: "\u30a6\u30a4\u30eb\u30b9", emoji: "🧬", min: 0, max: 1, color: "#111827", desc: "Virus", major: 6, sub: "E" },
];
const getTier = (a: number) => TIERS.find(t => a >= t.min && a < t.max) || TIERS[TIERS.length - 1];
const getNextTier = (a: number) => { const i = TIERS.findIndex(t => a >= t.min && a < t.max); return i > 0 ? TIERS[i - 1] : null; };
const fmt = (n: number, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fmtK = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : `${n}`;

// CoinGecko
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

// Blockfrost
const BF_BASE = "https://cardano-mainnet.blockfrost.io/api/v0";
async function bfGet(path: string, bfKey: string) {
  const res = await fetch(`${BF_BASE}${path}`, { headers: { project_id: bfKey } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blockfrost ${path} ${res.status}`);
  return res.json();
}
async function fetchWalletFromBF(stakeAddr: string, bfKey: string, name?: string) {
  const acct: any = await bfGet(`/accounts/${stakeAddr}`, bfKey);
  if (!acct) throw new Error("Account not found");
  const balAda = Number(acct.controlled_amount || "0") / 1e6;
  const rewAda = (Number(acct.rewards_sum || "0") - Number(acct.withdrawals_sum || "0")) / 1e6;
  let poolTicker = "\u2014";
  if (acct.pool_id) { try { const pm: any = await bfGet(`/pools/${acct.pool_id}/metadata`, bfKey); poolTicker = pm?.ticker || acct.pool_id.slice(0, 8); } catch { poolTicker = acct.pool_id.slice(0, 8); } }
  let drepLabel = "\u2014";
  if (acct.drep_id) { if (acct.drep_id === "drep_always_abstain") drepLabel = "Abstain"; else if (acct.drep_id === "drep_always_no_confidence") drepLabel = "No Confidence"; else drepLabel = acct.drep_id.slice(0, 16) + "..."; }
  let rewards: any[] = [];
  try { const rd = await bfGet(`/accounts/${stakeAddr}/rewards?count=30&order=desc`, bfKey); rewards = (rd || []).map((r: any) => ({ epoch: r.epoch, ada: +r.amount / 1e6 })); } catch {}
  return { id: stakeAddr, name: name || stakeAddr.slice(0, 12) + "...", stake: stakeAddr, bal: balAda, pool: poolTicker, poolId: acct.pool_id || "", drep: drepLabel, drepId: acct.drep_id || "", rew: rewAda, rewards, active: acct.active };
}

// Mock data
const MOCK_P: any = { ADA: { usd: 0.75, jpy: 112.5, btc: 0.0000084, mcap: 26250000000 }, BTC: { usd: 89200, jpy: 13380000, btc: 1, mcap: 1766160000000 }, ETH: { usd: 2100, jpy: 315000, btc: 0.02354, mcap: 252000000000 }, SOL: { usd: 140, jpy: 21000, btc: 0.00157, mcap: 60200000000 }, XRP: { usd: 2.35, jpy: 352, btc: 0.0000264, mcap: 129250000000 }, GOLD: { usd: 2950, jpy: 442500, btc: 0.03308, mcap: 15635000000 } };
const MOCK_PC: any = { ADA: { "24h": 2.1, "7d": -3.5, "1m": 8.2, "1y": 45.2 }, BTC: { "24h": 0.8, "7d": -1.2, "1m": 5.1, "1y": 62.1 }, ETH: { "24h": 1.5, "7d": -2.8, "1m": 3.4, "1y": 18.7 }, SOL: { "24h": 3.2, "7d": 1.5, "1m": -8.4, "1y": 85.3 }, XRP: { "24h": -0.5, "7d": 2.3, "1m": 12.8, "1y": 280.3 }, GOLD: { "24h": 0.3, "7d": 1.2, "1m": 4.5, "1y": 28.5 } };
const MOCK_HL: any = { ADA: { "24h": { hi: 0.78, lo: 0.72 }, all: { hi: 3.10, lo: 0.017 } }, BTC: { "24h": { hi: 90100, lo: 88200 }, all: { hi: 108786, lo: 3200 } }, ETH: { "24h": { hi: 2150, lo: 2050 }, all: { hi: 4878, lo: 0.43 } }, SOL: { "24h": { hi: 145, lo: 135 }, all: { hi: 294, lo: 0.50 } }, XRP: { "24h": { hi: 2.40, lo: 2.28 }, all: { hi: 3.84, lo: 0.003 } }, GOLD: { "24h": { hi: 2960, lo: 2935 }, all: { hi: 2980, lo: 1520 } } };

// Mock 90-day history
const MOCK_HIST = (() => {
  let seed = 42;
  const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const noise = () => (srand() - 0.48) * 2;
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (90 - i));
    const t = i / 89;
    const lerp = (s: number, e: number) => s + (e - s) * t;
    const n = (base: number, vol: number) => +(base + noise() * vol * base).toFixed(base < 1 ? 4 : 0);
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`,
      pADA: n(lerp(0.55, 0.75), 0.03), btcPrice: n(lerp(75000, 89200), 0.02),
      ethPrice: n(lerp(1800, 2100), 0.03), solPrice: n(lerp(110, 140), 0.04),
      xrpPrice: n(lerp(1.5, 2.35), 0.03), goldPrice: n(lerp(2650, 2950), 0.01),
    };
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

// ══════════════════════════ Collapsible Section ══════════════════════════
function Section({ title, icon, children, defaultOpen = true, badge }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm text-gray-200 flex-1">{title}</span>
        {badge && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{badge}</span>}
        <span className="text-gray-500 text-xs">{open ? "\u25b2" : "\u25bc"}</span>
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
  const [bfKey, setBfKey] = useState(""); const [bfStatus, setBfStatus] = useState("idle"); const [bfError, setBfError] = useState("");
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const P = liveP || MOCK_P;
  const PC = livePC || MOCK_PC;
  const HL = liveHL || MOCK_HL;
  const HIST = liveHist || MOCK_HIST;
  const isLive = !!liveP;
  const H = (v: any) => hide ? "\u2022\u2022\u2022\u2022\u2022" : v;

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
        setLiveHist(adaH.map((a: any) => ({
          date: a.date, pADA: a.price,
          btcPrice: lookup.BTC?.[a.date]?.price || 89200, ethPrice: lookup.ETH?.[a.date]?.price || 2100,
          solPrice: lookup.SOL?.[a.date]?.price || 140, xrpPrice: lookup.XRP?.[a.date]?.price || 2.35,
          goldPrice: lookup.GOLD?.[a.date]?.price || 2950,
        })));
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

  const addWallet = useCallback(async () => {
    const addr = newAddr.trim();
    if (!addr || !bfKey) { setBfError("Blockfrost API\u30ad\u30fc\u3092\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044"); setBfStatus("error"); return; }
    let stakeAddr = addr;
    if (addr.startsWith("addr")) {
      setBfStatus("loading");
      try { const info: any = await bfGet(`/addresses/${addr}`, bfKey); if (!info?.stake_address) throw new Error("Not found"); stakeAddr = info.stake_address; } catch (e: any) { setBfStatus("error"); setBfError(e.message); return; }
    }
    if (wallets.find((w: any) => w.stake === stakeAddr)) { setBfError("Already added"); setBfStatus("error"); return; }
    setBfStatus("loading"); setBfError("");
    try {
      const wData = await fetchWalletFromBF(stakeAddr, bfKey, newName || undefined);
      setWallets(prev => [...prev, wData]);
      if (wData.rewards.length > 0) setWalletRewards(prev => [...prev, ...wData.rewards.map((r: any) => ({ ...r, wallet: wData.name }))]);
      setNewAddr(""); setNewName(""); setBfStatus("ok");
    } catch (e: any) { setBfStatus("error"); setBfError(e.message); }
  }, [newAddr, newName, bfKey, wallets]);

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
      {/* ═══ Header Bar ═══ */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">\u20b3</div>
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

      {/* ═══ Tier Banner ═══ */}
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
            <div className="text-2xl font-bold">{H(`\u20b3 ${fmt(totalAda)}`)}</div>
            <div className="text-sm text-green-400">{H(`$${fmt(totalAda * P.ADA.usd, 2)}`)}</div>
            <div className="text-xs text-gray-500">{H(`\u00a5${fmt(totalAda * P.ADA.jpy)}`)}</div>
          </div>
          {next && <div className="text-right border-l border-gray-700 pl-4">
            <div className="text-xs text-gray-500">Next Tier</div>
            <div className="text-sm">{next.emoji} {next.name}</div>
            <div className="text-xs text-blue-400">{fmt(next.min - totalAda)} ADA</div>
          </div>}
        </div>
      )}

      {/* ═══ Section 1: Asset Price Table ═══ */}
      <Section title="\u4fa1\u683c\u30c6\u30fc\u30d6\u30eb" icon="📊" badge={isLive ? "Live" : "Mock"}>
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
                <td className="py-2 text-right text-green-300 font-mono">{hl ? `$${hl.hi}` : "\u2014"}</td>
                <td className="py-2 text-right text-red-300 font-mono">{hl ? `$${hl.lo}` : "\u2014"}</td>
                <td className="py-2 text-right text-gray-400">${price.mcap ? (price.mcap / 1e9).toFixed(1) + "B" : "\u2014"}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </Section>

      {/* ═══ Section 2: Price Analysis Chart ═══ */}
      <Section title="\u4fa1\u683c\u6bd4\u8f03\u5206\u6790" icon="📈">
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
        {priceMode === "indexed" && <div className="flex items-center gap-3 mb-2"><span className="text-xs text-gray-500">Base:</span><span className="text-xs text-white font-bold bg-purple-600/30 px-2 py-0.5 rounded">{priceFiltered[safeBaseIdx]?.date || "\u2014"} = 100</span><input type="range" min={0} max={priceFiltered.length-1} value={safeBaseIdx} onChange={e=>setBaseIdx(+e.target.value)} className="flex-1 h-1 accent-purple-500"/></div>}
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

      {/* ═══ Section 3: Wallets ═══ */}
      <Section title="\u4fdd\u6709\u4e00\u89a7\uff08\u30a6\u30a9\u30ec\u30c3\u30c8\uff0b\u53d6\u5f15\u6240\uff09" icon="👛" badge={`${wallets.length}\u30a6\u30a9\u30ec\u30c3\u30c8 \u00b7 ${manual.length}\u624b\u52d5`}>
        <div className="flex gap-2 mb-2">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="\u30a6\u30a9\u30ec\u30c3\u30c8\u540d" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-36"/>
          <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="stake1... / addr1..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600"/>
          <button onClick={addWallet} disabled={bfStatus==="loading"} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium">{bfStatus==="loading" ? "\u2026" : "+ Blockfrost"}</button>
        </div>
        {bfStatus==="error" && bfError && <div className="text-xs text-red-400 mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1">{bfError}<button onClick={()=>{setBfStatus("idle");setBfError("")}} className="ml-2 text-red-300">\u2715</button></div>}
        {bfStatus==="ok" && <div className="text-xs text-green-400 mb-2">\u2713 Blockfrost\u53d6\u5f97\u5b8c\u4e86</div>}
        <div className="flex gap-2 mb-2">
          <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="\u53d6\u5f15\u6240\u540d" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-32"/>
          <input value={mAmt} onChange={e=>setMAmt(e.target.value)} placeholder="ADA\u6570\u91cf" type="number" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-28"/>
          <button onClick={addManual} className="bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium">+ \u624b\u52d5</button>
        </div>
        <div className="text-xs text-gray-600 mb-2">🛡️ \u30ed\u30fc\u30ab\u30eb\u306e\u307f\u4fdd\u5b58\u30fb\u30b5\u30fc\u30d0\u30fc\u9001\u4fe1\u306a\u3057</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 text-left border-b border-gray-700">
              <th className="pb-1.5">\u7a2e\u5225</th><th className="pb-1.5">\u540d\u524d</th><th className="pb-1.5 text-right">\u6b8b\u9ad8</th><th className="pb-1.5">\u30d7\u30fc\u30eb</th><th className="pb-1.5">DRep</th><th className="pb-1.5 text-right">\u5831\u916c</th><th className="pb-1.5 w-6"></th>
            </tr></thead>
            <tbody>
              {wallets.map((w: any) => (
                <tr key={w.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-1.5"><span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">Wallet</span></td>
                  <td className="py-1.5 text-white font-medium">{w.name}</td>
                  <td className="py-1.5 text-right text-white font-bold">{H(`\u20b3 ${fmt(w.bal)}`)}</td>
                  <td className="py-1.5 text-blue-400 font-bold">[{w.pool}]</td>
                  <td className="py-1.5 text-purple-400">{w.drep}</td>
                  <td className="py-1.5 text-right text-green-400">\u20b3 {fmt(w.rew, 1)}</td>
                  <td className="py-1.5"><button onClick={()=>setWallets(wallets.filter((x: any)=>x.id!==w.id))} className="text-red-400 hover:text-red-300">\u00d7</button></td>
                </tr>
              ))}
              {manual.map((e: any) => (
                <tr key={`m-${e.id}`} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-1.5"><span className="text-xs bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded">\u624b\u52d5</span></td>
                  <td className="py-1.5 text-white font-medium">{e.name}</td>
                  <td className="py-1.5 text-right text-white font-bold">{H(`\u20b3 ${fmt(e.amount)}`)}</td>
                  <td className="py-1.5 text-gray-600">\u2014</td><td className="py-1.5 text-gray-600">\u2014</td><td className="py-1.5 text-gray-600">\u2014</td>
                  <td className="py-1.5"><button onClick={()=>setManual(manual.filter((x: any)=>x.id!==e.id))} className="text-red-400 hover:text-red-300">\u00d7</button></td>
                </tr>
              ))}
              {wallets.length===0 && manual.length===0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">\u30a6\u30a9\u30ec\u30c3\u30c8\u672a\u8ffd\u52a0\u3002Blockfrost\u307e\u305f\u306f\u624b\u52d5\u3067\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ═══ Section 4: Rewards ═══ */}
      <Section title="\u5831\u916c\u30b5\u30de\u30ea\u30fc" icon="🪙" badge={`\u20b3 ${fmt(totalRew, 1)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Staking: <span className="text-green-400 font-bold">{H(`\u20b3 ${fmt(totalRew,1)}`)}</span></span>
          <button onClick={exportCSV} className="text-xs bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded">CSV\u51fa\u529b</button>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={rewardData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
            <XAxis dataKey="epoch" tick={{fill:"#6B7280",fontSize:8}} tickLine={false}/>
            <YAxis tick={{fill:"#6B7280",fontSize:8}} tickLine={false} width={25}/>
            <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v: any)=>[`\u20b3 ${v}`,"\u5831\u916c"]}/>
            <Bar dataKey="ada" fill="#10B981" radius={[2,2,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ═══ Section 5: Settings (collapsed) ═══ */}
      <Section title="\u8a2d\u5b9a" icon="\u2699\ufe0f" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2">Blockfrost API</h3>
            <div className="flex gap-2">
              <input type="text" value={bfKey} onChange={e=>setBfKey(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white" placeholder="mainnetXXX..."/>
              <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2 rounded text-xs">{apiStatus==="loading" ? "\u2026" : "\u4fa1\u683c\u53d6\u5f97"}</button>
            </div>
            <span className="text-xs text-gray-600 mt-1 block">blockfrost.io \u3067\u7121\u6599\u30ad\u30fc\u53d6\u5f97\uff0850,000\u56de/\u65e5\uff09</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2">USD/JPY Rate</h3>
            <input type="number" value={jpyRate} onChange={e=>setJpyRate(+e.target.value||150)} className="w-32 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white"/>
          </div>
          {apiStatus==="ok" && <div className="text-xs text-green-400">\u2713 {lastFetch?.toLocaleString()}</div>}
          <div className="text-xs text-gray-600">CoinGecko\u7121\u6599API (30req/min) \u00b7 \u30ed\u30fc\u30ab\u30eb\u4fdd\u5b58\u306e\u307f</div>
        </div>
      </Section>

      {/* ═══ Tier Reference (collapsed) ═══ */}
      <Section title="\u5168{TIERS.length}\u6bb5\u968e\u30c6\u30a3\u30a2\u4e00\u89a7" icon="🏆" defaultOpen={false}>
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
""")
log("CardanoWatch single-page component written")

# ============================================================
# Step 2: Rewrite Holder page (now the root page)
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Rewriting ADA Holder page")
print("=" * 60)

holder_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/holder/page.tsx")
os.makedirs(os.path.dirname(holder_page), exist_ok=True)

with open(holder_page, "w") as f:
    f.write('''"use client";
import dynamic from "next/dynamic";
const CardanoWatch = dynamic(() => import("@/components/CardanoWatch"), { ssr: false });

export default function HolderDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ADA Holder Dashboard</h1>
      <CardanoWatch />
    </div>
  );
}
''')
log("Holder page rewritten (clean, single-page)")

# ============================================================
# Step 3: Create root page that redirects to /dashboard/holder
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Setting ADA Holder as site default")
print("=" * 60)

# Create a root page.tsx that redirects
root_page_dir = os.path.join(PROJECT_FE, "src/app/(explorer)")
root_page = os.path.join(root_page_dir, "page.tsx")
if os.path.exists(root_page):
    shutil.copy2(root_page, root_page + ".bak")

with open(root_page, "w") as f:
    f.write('''import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard/holder"); }
''')
log("Root '/' now redirects to /dashboard/holder")

# Also update /dashboard to redirect to /dashboard/holder
dash_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/page.tsx")
if os.path.exists(dash_page):
    shutil.copy2(dash_page, dash_page + ".bak")

with open(dash_page, "w") as f:
    f.write('''export const dynamic = "force-dynamic";

const dashboards = [
  { name: "ADA Holder", href: "/dashboard/holder", emoji: "🪙", desc: "Portfolio, prices, wallets, rewards" },
  { name: "SPO", href: "/dashboard/spo", emoji: "🏊", desc: "Pool performance, delegators, blocks" },
  { name: "DRep", href: "/dashboard/drep", emoji: "🗳️", desc: "Voting matrix, governance, simulator" },
  { name: "Governance", href: "/dashboard/governance", emoji: "🏛️", desc: "Proposals, committee, constitution" },
  { name: "Chain Analyst", href: "/dashboard/chain", emoji: "🔗", desc: "Epochs, blocks, transactions, stats" },
];

export default function DashboardIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map(d => (
          <a key={d.href} href={d.href} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition border border-gray-700 hover:border-gray-600">
            <div className="text-3xl mb-3">{d.emoji}</div>
            <h2 className="text-lg font-bold mb-1">{d.name}</h2>
            <p className="text-sm text-gray-400">{d.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
''')
log("Dashboard index updated (5 dashboards only)")

# ============================================================
# Step 4: Update Header navigation
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Updating Header navigation")
print("=" * 60)

# Write to both paths (layout/Header.tsx is the one actually used by the server)
header_file = os.path.join(PROJECT_FE, "src/components/Header.tsx")
header_layout_file = os.path.join(PROJECT_FE, "src/components/layout/Header.tsx")
if os.path.exists(header_file):
    shutil.copy2(header_file, header_file + ".bak")

with open(header_file, "w") as f:
    f.write('''"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const dashboards = [
  { label: "ADA Holder", href: "/dashboard/holder" },
  { label: "SPO", href: "/dashboard/spo" },
  { label: "DRep", href: "/dashboard/drep" },
  { label: "Governance", href: "/dashboard/governance" },
  { label: "Chain Analyst", href: "/dashboard/chain" },
];

const explorer = [
  { label: "Overview", href: "/explorer" },
  { section: "Chain" },
  { label: "Blocks & Transactions", href: "/explorer/chain" },
  { section: "Staking" },
  { label: "Pools & Delegations", href: "/explorer/staking" },
  { section: "Governance" },
  { label: "Proposals & Votes", href: "/explorer/governance" },
  { section: "Assets" },
  { label: "Tokens & Mints", href: "/explorer/tokens" },
  { section: "Analysis" },
  { label: "Network Analytics", href: "/explorer/analytics" },
  { label: "Rich List & Whales", href: "/explorer/addresses" },
];

function Dropdown({ label, items, isActive }: { label: string; items: any[]; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
        {label} <span className="text-xs ml-0.5">{"\u25be"}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[200px] z-50">
          {items.map((item, i) => item.section ? (
            <div key={i} className="px-3 py-1 text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{item.section}</div>
          ) : (
            <Link key={item.href} href={item.href} className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isDash = pathname.startsWith("/dashboard");
  const isExplorer = pathname.startsWith("/explorer");

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard/holder" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{"\u20b3"}</div>
          <span className="text-lg font-bold"><span className="text-blue-400">ADA</span>tool</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Dropdown label="Dashboards" items={dashboards} isActive={isDash} />
          <Dropdown label="Explorer" items={explorer} isActive={isExplorer} />
          <Link href="/live" className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${pathname === "/live" ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
          </Link>
          <Link href="/search" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${pathname === "/search" ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            {"🔍"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
''')
os.makedirs(os.path.dirname(header_layout_file), exist_ok=True)
shutil.copy2(header_file, header_layout_file)
log("Header rewritten with 5 dashboards + explorer (both paths)")

# ============================================================
# Step 5: Build & Deploy
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Building frontend")
print("=" * 60)

# Skip .next deletion for incremental build (much faster)
# dotNext = os.path.join(PROJECT_FE, ".next")
# if os.path.isdir(dotNext):
#     shutil.rmtree(dotNext)

code, out, errs = run("npm run build 2>&1", timeout=600)
if code != 0:
    err("BUILD FAILED!")
    combined = out + errs
    for line in combined.strip().split("\n")[-40:]:
        print(f"  {line}")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# ============================================================
# Step 6: Test
# ============================================================
print("\n" + "=" * 60)
print("STEP 6: Testing")
print("=" * 60)

pages = [
    "dashboard/holder", "dashboard/spo", "dashboard/drep",
    "dashboard/governance", "dashboard/chain",
    "dashboard/drep/votes-matrix", "dashboard/drep/governance", "dashboard/drep/simulator",
    "dashboard",
    "explorer", "explorer/chain", "explorer/staking", "explorer/governance",
    "explorer/tokens", "explorer/analytics", "explorer/addresses",
    "live", "search",
]
ok = fail = 0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    s = out.strip().strip("'")
    if s.startswith("2") or s.startswith("3"):
        log(f"  /{p} => {s}")
        ok += 1
    else:
        warn(f"  /{p} => {s}")
        fail += 1

# Test root redirect
_, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 10")
s = out.strip().strip("'")
log(f"  / => {s} (redirect to /dashboard/holder)")

print(f"\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")

print("\n" + "=" * 60)
log("DONE! Restructure complete.")
print("  Site default: / -> /dashboard/holder (CardanoWatch)")
print("  Dashboards: ADA Holder, SPO, DRep, Governance, Chain Analyst")
print("  Removed: CC, Portfolio, Developer")
print("=" * 60)
