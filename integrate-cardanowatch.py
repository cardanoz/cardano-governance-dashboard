#!/usr/bin/env python3
"""
Integrate CardanoWatch UI into ADA Holder Dashboard.
Creates a tabbed client-side page with:
  Tab 1: Portfolio Overview (tier system + asset table + price charts)
  Tab 2: Wallet Management (Blockfrost + manual entries)
  Tab 3: Rewards (staking rewards chart + CSV export)
  Tab 4: On-Chain Data (existing API data from /dashboard/holder)
  Tab 5: Settings (API keys, JPY rate)

Run on server: python3 integrate-cardanowatch.py
"""
import os, subprocess, time, shutil

PROJECT_FE  = "/home/ubuntu/adatool-frontend"
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
# Step 1: Ensure recharts is installed
# ============================================================
print("=" * 60)
print("STEP 1: Checking dependencies")
print("=" * 60)

code, out, _ = run("npm ls recharts 2>/dev/null")
if "recharts" not in out:
    log("Installing recharts...")
    run("npm install recharts --save")
else:
    log("recharts already installed")

# Check lucide-react
code, out, _ = run("npm ls lucide-react 2>/dev/null")
if "lucide-react" not in out:
    log("Installing lucide-react...")
    run("npm install lucide-react --save")
else:
    log("lucide-react already installed")

# ============================================================
# Step 2: Create CardanoWatch component
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Creating CardanoWatch component")
print("=" * 60)

comp_dir = os.path.join(PROJECT_FE, "src/components")
os.makedirs(comp_dir, exist_ok=True)

# Write the CardanoWatch component file
cw_file = os.path.join(comp_dir, "CardanoWatch.tsx")
with open(cw_file, "w") as f:
    f.write('''"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, ReferenceLine
} from "recharts";

// ══════════════════════════════════════════════
// 35-Tier System
// ══════════════════════════════════════════════
const MAJOR_TIERS = [
  { name: "\\u795e\\u8a71\\u30fb\\u4f1d\\u8aac\\u7d1a", emoji: "\\ud83c\\udfdb\\ufe0f", color: "#FBBF24", range: "5M+" },
  { name: "\\u53e4\\u4ee3\\u751f\\u547d\\u7d1a", emoji: "\\ud83e\\uddb4", color: "#7C3AED", range: "2M~5M" },
  { name: "\\u30af\\u30b8\\u30e9\\u7d1a", emoji: "\\ud83d\\udc0b", color: "#2563EB", range: "500K~2M" },
  { name: "\\u4e2d\\u578b\\u9b5a\\u7d1a", emoji: "\\ud83d\\udc1f", color: "#0891B2", range: "100K~500K" },
  { name: "\\u5c0f\\u578b\\u9b5a\\u7d1a", emoji: "\\ud83d\\udc20", color: "#34D399", range: "10K~100K" },
  { name: "\\u7532\\u6bbb\\u985e\\u30fb\\u5c0f\\u751f\\u7269\\u7d1a", emoji: "\\ud83e\\udd90", color: "#FB923C", range: "1K~10K" },
  { name: "\\u30d7\\u30e9\\u30f3\\u30af\\u30c8\\u30f3\\u30fb\\u5fae\\u751f\\u7269\\u7d1a", emoji: "\\ud83e\\udda0", color: "#6B7280", range: "~1K" },
];

const TIERS = [
  { name: "\\u30dd\\u30bb\\u30a4\\u30c9\\u30f3", emoji: "\\ud83d\\udd31", min: 10000000, max: Infinity, color: "#FFD700", desc: "\\u6d77\\u795e", major: 0, sub: "S+" },
  { name: "\\u30ea\\u30f4\\u30a1\\u30a4\\u30a2\\u30b5\\u30f3", emoji: "\\ud83d\\udc09", min: 8000000, max: 10000000, color: "#FCD34D", desc: "\\u6d77\\u306e\\u602a\\u7269", major: 0, sub: "S" },
  { name: "\\u30af\\u30e9\\u30fc\\u30b1\\u30f3", emoji: "\\ud83e\\udd91", min: 6000000, max: 8000000, color: "#F59E0B", desc: "\\u6df1\\u6df5\\u306e\\u4e3b", major: 0, sub: "A" },
  { name: "\\u30e8\\u30eb\\u30e0\\u30f3\\u30ac\\u30f3\\u30c9", emoji: "\\ud83d\\udc0d", min: 5000000, max: 6000000, color: "#D97706", desc: "\\u4e16\\u754c\\u86c7", major: 0, sub: "B" },
  { name: "\\u30e1\\u30ac\\u30ed\\u30c9\\u30f3", emoji: "\\ud83e\\uddb7", min: 4000000, max: 5000000, color: "#8B5CF6", desc: "\\u53e4\\u4ee3\\u5de8\\u5927\\u30b5\\u30e1", major: 1, sub: "S" },
  { name: "\\u30c0\\u30f3\\u30af\\u30eb\\u30aa\\u30b9\\u30c6\\u30a6\\u30b9", emoji: "\\ud83d\\udee1\\ufe0f", min: 3500000, max: 4000000, color: "#7C3AED", desc: "\\u88c5\\u7532\\u9b5a", major: 1, sub: "A" },
  { name: "\\u30ea\\u30fc\\u30c9\\u30b7\\u30af\\u30c6\\u30a3\\u30b9", emoji: "\\ud83d\\udc0b", min: 2500000, max: 3500000, color: "#6D28D9", desc: "\\u53f2\\u4e0a\\u6700\\u5927\\u786c\\u9aa8\\u9b5a", major: 1, sub: "B" },
  { name: "\\u30d0\\u30b7\\u30ed\\u30b5\\u30a6\\u30eb\\u30b9", emoji: "\\ud83e\\udd95", min: 2000000, max: 2500000, color: "#5B21B6", desc: "\\u539f\\u59cb\\u30af\\u30b8\\u30e9", major: 1, sub: "C" },
  { name: "\\u30b7\\u30ed\\u30ca\\u30ac\\u30b9\\u30af\\u30b8\\u30e9", emoji: "\\ud83d\\udc33", min: 1500000, max: 2000000, color: "#3B82F6", desc: "Blue Whale", major: 2, sub: "S" },
  { name: "\\u30de\\u30c3\\u30b3\\u30a6\\u30af\\u30b8\\u30e9", emoji: "\\ud83d\\udc0b", min: 1000000, max: 1500000, color: "#2563EB", desc: "Sperm Whale", major: 2, sub: "A" },
  { name: "\\u30b6\\u30c8\\u30a6\\u30af\\u30b8\\u30e9", emoji: "\\ud83d\\udc0b", min: 800000, max: 1000000, color: "#1D4ED8", desc: "Humpback", major: 2, sub: "B" },
  { name: "\\u30b8\\u30f3\\u30d9\\u30a8\\u30b6\\u30e1", emoji: "\\ud83e\\udd88", min: 650000, max: 800000, color: "#1E40AF", desc: "Whale Shark", major: 2, sub: "C" },
  { name: "\\u30db\\u30aa\\u30b8\\u30ed\\u30b6\\u30e1", emoji: "\\ud83e\\udd88", min: 500000, max: 650000, color: "#1E3A8A", desc: "Great White", major: 2, sub: "D" },
  { name: "\\u30de\\u30b0\\u30ed", emoji: "\\ud83d\\udc1f", min: 400000, max: 500000, color: "#06B6D4", desc: "Tuna", major: 3, sub: "S" },
  { name: "\\u30ab\\u30b8\\u30ad", emoji: "\\u2694\\ufe0f", min: 300000, max: 400000, color: "#0891B2", desc: "Marlin", major: 3, sub: "A" },
  { name: "\\u30d0\\u30e9\\u30af\\u30fc\\u30c0", emoji: "\\ud83d\\udc21", min: 200000, max: 300000, color: "#0E7490", desc: "Barracuda", major: 3, sub: "B" },
  { name: "\\u30b5\\u30fc\\u30e2\\u30f3", emoji: "\\ud83c\\udf63", min: 150000, max: 200000, color: "#155E75", desc: "Salmon", major: 3, sub: "C" },
  { name: "\\u30bf\\u30a4", emoji: "\\ud83d\\udc21", min: 120000, max: 150000, color: "#164E63", desc: "Sea Bream", major: 3, sub: "D" },
  { name: "\\u30a2\\u30b8", emoji: "\\ud83d\\udc1f", min: 100000, max: 120000, color: "#134E4A", desc: "Horse Mackerel", major: 3, sub: "E" },
  { name: "\\u30af\\u30de\\u30ce\\u30df", emoji: "\\ud83d\\udc20", min: 70000, max: 100000, color: "#34D399", desc: "Clownfish", major: 4, sub: "S" },
  { name: "\\u30cd\\u30aa\\u30f3\\u30c6\\u30c8\\u30e9", emoji: "\\ud83d\\udc8e", min: 50000, max: 70000, color: "#10B981", desc: "Neon Tetra", major: 4, sub: "A" },
  { name: "\\u30bf\\u30c4\\u30ce\\u30aa\\u30c8\\u30b7\\u30b4", emoji: "\\ud83d\\udc34", min: 30000, max: 50000, color: "#059669", desc: "Seahorse", major: 4, sub: "B" },
  { name: "\\u30e1\\u30c0\\u30ab", emoji: "\\ud83d\\udc1f", min: 20000, max: 30000, color: "#047857", desc: "Killifish", major: 4, sub: "C" },
  { name: "\\u30b0\\u30c3\\u30d4\\u30fc", emoji: "\\ud83d\\udc1f", min: 10000, max: 20000, color: "#065F46", desc: "Guppy", major: 4, sub: "D" },
  { name: "\\u30a4\\u30bb\\u30a8\\u30d3", emoji: "\\ud83e\\udde6", min: 7000, max: 10000, color: "#F97316", desc: "Lobster", major: 5, sub: "S" },
  { name: "\\u30ab\\u30cb", emoji: "\\ud83e\\udd80", min: 5000, max: 7000, color: "#EA580C", desc: "Crab", major: 5, sub: "A" },
  { name: "\\u30a8\\u30d3", emoji: "\\ud83e\\udd90", min: 3000, max: 5000, color: "#DC2626", desc: "Shrimp", major: 5, sub: "B" },
  { name: "\\u30e4\\u30c9\\u30ab\\u30ea", emoji: "\\ud83d\\udc1a", min: 2000, max: 3000, color: "#B91C1C", desc: "Hermit Crab", major: 5, sub: "C" },
  { name: "\\u30d5\\u30b8\\u30c4\\u30dc", emoji: "\\ud83e\\udea8", min: 1000, max: 2000, color: "#991B1B", desc: "Barnacle", major: 5, sub: "D" },
  { name: "\\u30aa\\u30ad\\u30a2\\u30df", emoji: "\\ud83e\\udd90", min: 500, max: 1000, color: "#9CA3AF", desc: "Krill", major: 6, sub: "S" },
  { name: "\\u30df\\u30b8\\u30f3\\u30b3", emoji: "\\ud83d\\udd0d", min: 200, max: 500, color: "#6B7280", desc: "Daphnia", major: 6, sub: "A" },
  { name: "\\u30d7\\u30e9\\u30f3\\u30af\\u30c8\\u30f3", emoji: "\\ud83e\\udee7", min: 50, max: 200, color: "#4B5563", desc: "Plankton", major: 6, sub: "B" },
  { name: "\\u30a2\\u30e1\\u30fc\\u30d0", emoji: "\\ud83d\\udd2c", min: 10, max: 50, color: "#374151", desc: "Amoeba", major: 6, sub: "C" },
  { name: "\\u30d0\\u30af\\u30c6\\u30ea\\u30a2", emoji: "\\ud83e\\uddeb", min: 1, max: 10, color: "#1F2937", desc: "Bacteria", major: 6, sub: "D" },
  { name: "\\u30a6\\u30a4\\u30eb\\u30b9", emoji: "\\ud83e\\uddec", min: 0, max: 1, color: "#111827", desc: "Virus", major: 6, sub: "E" },
];

const getTier = (a: number) => TIERS.find(t => a >= t.min && a < t.max) || TIERS[TIERS.length - 1];
const getNextTier = (a: number) => { const i = TIERS.findIndex(t => a >= t.min && a < t.max); return i > 0 ? TIERS[i - 1] : null; };
const fmt = (n: number, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fmtK = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : `${n}`;

// CoinGecko
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_IDS: Record<string,string> = { ADA: "cardano", BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", GOLD: "pax-gold" };
const CG_SUPPLY: Record<string,number> = { ADA: 35e9, BTC: 19.8e6, ETH: 120.4e6, SOL: 430e6, XRP: 55e9, GOLD: 5.3e6 };

async function fetchMarkets(jpyRate: number) {
  const ids = Object.values(CG_IDS).join(",");
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d,1y&sparkline=false&order=market_cap_desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const P: any = {}, PC: any = {}, HL: any = {};
  const idToKey = Object.fromEntries(Object.entries(CG_IDS).map(([k, v]) => [v, k]));
  for (const c of data) {
    const key = idToKey[c.id]; if (!key) continue;
    const btcRate = data.find((x: any) => x.id === "bitcoin")?.current_price || 86750;
    P[key] = { usd: c.current_price, jpy: c.current_price * jpyRate, btc: c.current_price / btcRate, mcap: c.market_cap };
    PC[key] = { "24h": +(c.price_change_percentage_24h || 0).toFixed(1), "7d": +(c.price_change_percentage_7d_in_currency || 0).toFixed(1), "1m": +(c.price_change_percentage_30d_in_currency || 0).toFixed(1), "3m": 0, "6m": 0, "1y": +(c.price_change_percentage_1y_in_currency || 0).toFixed(1) };
    HL[key] = { "24h": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price }, "7d": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price }, "1m": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price }, all: { hi: c.ath || c.current_price, lo: c.atl || 0 } };
  }
  return { P, PC, HL };
}

async function fetchHistory(id: string) {
  const url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko history ${res.status}`);
  const data = await res.json();
  return (data.prices || []).map(([ts, price]: [number, number]) => {
    const d = new Date(ts);
    return { date: `${d.getMonth()+1}/${d.getDate()}`, price, ts };
  });
}

function buildCombinedHist(histMap: any) {
  const adaH = histMap.ADA || [];
  if (adaH.length === 0) return null;
  const lookup: any = {};
  for (const [key, arr] of Object.entries(histMap)) {
    lookup[key] = {};
    for (const pt of (arr as any[])) lookup[key][pt.date] = pt;
  }
  return adaH.map((adaPt: any, i: number) => {
    const date = adaPt.date;
    const pADA = adaPt.price;
    const btcPrice = lookup.BTC?.[date]?.price || 86750;
    const ethPrice = lookup.ETH?.[date]?.price || 2800;
    const solPrice = lookup.SOL?.[date]?.price || 140;
    const xrpPrice = lookup.XRP?.[date]?.price || 2.1;
    const goldPrice = lookup.GOLD?.[date]?.price || 2850;
    return { date, pADA, btcPrice, ethPrice, solPrice, xrpPrice, goldPrice,
      mcADA: pADA * CG_SUPPLY.ADA, mcBTC: btcPrice * CG_SUPPLY.BTC, mcETH: ethPrice * CG_SUPPLY.ETH,
      mcSOL: solPrice * CG_SUPPLY.SOL, mcXRP: xrpPrice * CG_SUPPLY.XRP, mcGold: goldPrice * CG_SUPPLY.GOLD };
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
  if (!acct) throw new Error(`Account not found`);
  const balAda = Number(acct.controlled_amount || "0") / 1e6;
  const rewAda = (Number(acct.rewards_sum || "0") - Number(acct.withdrawals_sum || "0")) / 1e6;
  let poolTicker = "\\u2014";
  if (acct.pool_id) {
    try { const pm: any = await bfGet(`/pools/${acct.pool_id}/metadata`, bfKey); poolTicker = pm?.ticker || acct.pool_id.slice(0, 8); } catch { poolTicker = acct.pool_id.slice(0, 8); }
  }
  let drepLabel = "\\u2014";
  if (acct.drep_id) {
    if (acct.drep_id === "drep_always_abstain") drepLabel = "Abstain";
    else if (acct.drep_id === "drep_always_no_confidence") drepLabel = "No Confidence";
    else drepLabel = acct.drep_id.slice(0, 16) + "...";
  }
  let rewards: any[] = [];
  try { const rd = await bfGet(`/accounts/${stakeAddr}/rewards?count=30&order=desc`, bfKey); rewards = (rd || []).map((r: any) => ({ epoch: r.epoch, ada: +r.amount / 1e6, pool: r.pool_id })); } catch {}
  return { id: stakeAddr, name: name || stakeAddr.slice(0, 12) + "...", stake: stakeAddr, bal: balAda, pool: poolTicker, poolId: acct.pool_id || "", drep: drepLabel, drepId: acct.drep_id || "", rew: rewAda, rewards, active: acct.active };
}

// Mock data
const MOCK_P: any = { ADA: { usd: 0.75, jpy: 112.5, btc: 0.0000084, mcap: 26250000000 }, BTC: { usd: 89200, jpy: 13380000, btc: 1, mcap: 1766160000000 }, ETH: { usd: 2100, jpy: 315000, btc: 0.02354, mcap: 252000000000 }, SOL: { usd: 140, jpy: 21000, btc: 0.00157, mcap: 60200000000 }, XRP: { usd: 2.35, jpy: 352, btc: 0.0000264, mcap: 129250000000 }, GOLD: { usd: 2950, jpy: 442500, btc: 0.03308, mcap: 15635000000 } };
const MOCK_PC: any = { ADA: { "24h": 2.1, "7d": -3.5, "1m": 8.2, "3m": 15.4, "6m": -12.1, "1y": 45.2 }, BTC: { "24h": 0.8, "7d": -1.2, "1m": 5.1, "3m": 12.3, "6m": 8.5, "1y": 62.1 }, ETH: { "24h": 1.5, "7d": -2.8, "1m": 3.4, "3m": -5.2, "6m": -15.3, "1y": 18.7 }, SOL: { "24h": 3.2, "7d": 1.5, "1m": -8.4, "3m": -22.1, "6m": -30.5, "1y": 85.3 }, XRP: { "24h": -0.5, "7d": 2.3, "1m": 12.8, "3m": 45.2, "6m": 120.5, "1y": 280.3 }, GOLD: { "24h": 0.3, "7d": 1.2, "1m": 4.5, "3m": 8.2, "6m": 15.3, "1y": 28.5 } };
const MOCK_HL: any = { ADA: { "24h": { hi: 0.78, lo: 0.72 }, "7d": { hi: 0.82, lo: 0.70 }, "1m": { hi: 0.88, lo: 0.65 }, all: { hi: 3.10, lo: 0.017 } }, BTC: { "24h": { hi: 90100, lo: 88200 }, "7d": { hi: 91500, lo: 86800 }, "1m": { hi: 95000, lo: 82000 }, all: { hi: 108786, lo: 3200 } }, ETH: { "24h": { hi: 2150, lo: 2050 }, "7d": { hi: 2250, lo: 1980 }, "1m": { hi: 2400, lo: 1900 }, all: { hi: 4878, lo: 0.43 } }, SOL: { "24h": { hi: 145, lo: 135 }, "7d": { hi: 150, lo: 130 }, "1m": { hi: 165, lo: 120 }, all: { hi: 294, lo: 0.50 } }, XRP: { "24h": { hi: 2.40, lo: 2.28 }, "7d": { hi: 2.55, lo: 2.15 }, "1m": { hi: 2.80, lo: 2.00 }, all: { hi: 3.84, lo: 0.003 } }, GOLD: { "24h": { hi: 2960, lo: 2935 }, "7d": { hi: 2975, lo: 2910 }, "1m": { hi: 2980, lo: 2850 }, all: { hi: 2980, lo: 1520 } } };

// Mock 90-day price history
const MOCK_HIST = (() => {
  let seed = 42;
  const srand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const noise = () => (srand() - 0.48) * 2;
  const end: any = { ada: 0.75, btc: 89200, eth: 2100, sol: 140, xrp: 2.35, gold: 2950 };
  const start: any = { ada: 0.55, btc: 75000, eth: 1800, sol: 110, xrp: 1.50, gold: 2650 };
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (90 - i));
    const t = i / 89;
    const lerp = (s: number, e: number) => s + (e - s) * t;
    const n = (base: number, vol: number) => +(base + noise() * vol * base).toFixed(base < 1 ? 4 : base < 100 ? 2 : 0);
    const pADA = n(lerp(start.ada, end.ada), 0.03);
    const btcPrice = n(lerp(start.btc, end.btc), 0.02);
    const ethPrice = n(lerp(start.eth, end.eth), 0.03);
    const solPrice = n(lerp(start.sol, end.sol), 0.04);
    const xrpPrice = n(lerp(start.xrp, end.xrp), 0.03);
    const goldPrice = n(lerp(start.gold, end.gold), 0.01);
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`, pADA, btcPrice, ethPrice, solPrice, xrpPrice, goldPrice,
      mcADA: pADA * 35e9, mcBTC: btcPrice * 19.8e6, mcETH: ethPrice * 120e6,
      mcSOL: solPrice * 430e6, mcXRP: xrpPrice * 55e9, mcGold: goldPrice * 5.3e6,
    };
  });
})();

const CHANGE_PERIODS = [
  { key: "24h", label: "24h" }, { key: "7d", label: "7d" }, { key: "1m", label: "1M" },
  { key: "3m", label: "3M" }, { key: "6m", label: "6M" }, { key: "1y", label: "1Y" },
];

const Btn = ({active, onClick, children, color}: {active: boolean; onClick: () => void; children: React.ReactNode; color?: string}) => (
  <button onClick={onClick}
    className={`rounded text-xs font-medium border transition-colors px-1.5 py-0.5 ${active ? "text-white" : "text-gray-500 border-gray-700 hover:text-gray-300"}`}
    style={active ? {backgroundColor:(color||\'#3B82F6\')+\'33\', color: color||\'#fff\', borderColor:(color||\'#3B82F6\')+\'66\'} : {}}>
    {children}
  </button>
);

// ══════════════════════════════════════════════
// Main Exported Component
// ══════════════════════════════════════════════
export default function CardanoWatch() {
  const [tab, setTab] = useState("portfolio");
  const [hide, setHide] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [manual, setManual] = useState<any[]>([]);
  const [mName, setMName] = useState(""); const [mAmt, setMAmt] = useState("");
  const [newAddr, setNewAddr] = useState(""); const [newName, setNewName] = useState("");
  const [bfKey, setBfKey] = useState(""); const [bfStatus, setBfStatus] = useState("idle");
  const [bfError, setBfError] = useState("");

  // Live data
  const [liveP, setLiveP] = useState<any>(null);
  const [livePC, setLivePC] = useState<any>(null);
  const [liveHL, setLiveHL] = useState<any>(null);
  const [liveHist, setLiveHist] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState("idle");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [jpyRate, setJpyRate] = useState(150);
  const [walletRewards, setWalletRewards] = useState<any[]>([]);

  const P = liveP || MOCK_P;
  const PC = livePC || MOCK_PC;
  const PRICE_HL = liveHL || MOCK_HL;
  const COMBINED_HIST = liveHist || MOCK_HIST;
  const isLive = !!liveP;

  // Fetch live data from CoinGecko
  const fetchAllData = useCallback(async () => {
    setApiStatus("loading");
    try {
      const { P: newP, PC: newPC, HL: newHL } = await fetchMarkets(jpyRate);
      setLiveP(newP); setLivePC(newPC); setLiveHL(newHL);
      const histMap: any = {};
      for (const [key, id] of Object.entries(CG_IDS)) {
        try { histMap[key] = await fetchHistory(id); await new Promise(r => setTimeout(r, 1200)); } catch {}
      }
      const combined = buildCombinedHist(histMap);
      if (combined) setLiveHist(combined);
      if (histMap.ADA) {
        for (const [key, arr] of Object.entries(histMap)) {
          if (!newHL[key]) continue;
          const last7 = (arr as any[]).slice(-7), last30 = (arr as any[]).slice(-30);
          if (last7.length > 0) newHL[key]["7d"] = { hi: Math.max(...last7.map((x: any) => x.price)), lo: Math.min(...last7.map((x: any) => x.price)) };
          if (last30.length > 0) newHL[key]["1m"] = { hi: Math.max(...last30.map((x: any) => x.price)), lo: Math.min(...last30.map((x: any) => x.price)) };
        }
        setLiveHL({...newHL});
      }
      setApiStatus("ok"); setLastFetch(new Date());
    } catch (e: any) {
      const msg = (e.message || "").toLowerCase();
      if (e instanceof TypeError || msg.includes("fetch") || msg.includes("network") || msg.includes("cors")) {
        setApiStatus("idle");
      } else { setApiStatus("error"); }
    }
  }, [jpyRate]);

  // Chart state
  const [priceMode, setPriceMode] = useState("indexed");
  const [pricePeriod, setPricePeriod] = useState("all");
  const [baseIdx, setBaseIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState<Record<string,boolean>>({adaPrice: true, btcPrice: false, ethPrice: false, solPrice: false, xrpPrice: false, goldPrice: false});
  const [visiblePeriods, setVisiblePeriods] = useState<Record<string,boolean>>({"24h": true, "7d": true, "1m": true, "3m": false, "6m": false, "1y": false});
  const [hlPeriod, setHlPeriod] = useState("24h");

  const totalAda = useMemo(() => wallets.reduce((s: number, w: any) => s + (w.bal || 0), 0) + manual.reduce((s: number, e: any) => s + (e.amount || 0), 0), [wallets, manual]);
  const tier = getTier(totalAda);
  const next = getNextTier(totalAda);
  const H = (v: any) => hide ? "\\u2022\\u2022\\u2022\\u2022\\u2022" : v;

  const filterByPeriod = (data: any[], period: string) => {
    if (period === "all") return data;
    const days: Record<string,number> = { "24h": 1, "7d": 7, "1m": 30 };
    return data.slice(-(days[period] || 90));
  };

  const priceFiltered = useMemo(() => filterByPeriod(COMBINED_HIST, pricePeriod), [pricePeriod, COMBINED_HIST]);
  const safeBaseIdx = Math.min(baseIdx, priceFiltered.length - 1);
  const priceChartData = useMemo(() => {
    const priceKeys: Record<string,string> = { adaPrice: "pADA", btcPrice: "btcPrice", ethPrice: "ethPrice", solPrice: "solPrice", xrpPrice: "xrpPrice", goldPrice: "goldPrice" };
    const mcapKeys: Record<string,string> = { adaPrice: "mcADA", btcPrice: "mcBTC", ethPrice: "mcETH", solPrice: "mcSOL", xrpPrice: "mcXRP", goldPrice: "mcGold" };
    const base = priceFiltered[safeBaseIdx] || priceFiltered[0] || {};
    const basePrice: any = {};
    Object.entries(priceKeys).forEach(([k, rawK]) => { basePrice[k] = +base[rawK] || 1; });
    return priceFiltered.map((row: any) => {
      const entry: any = { date: row.date };
      Object.entries(priceKeys).forEach(([key, rawK]) => {
        if (priceMode === "price") entry[key] = +row[rawK];
        else if (priceMode === "mcap") entry[key] = +row[mcapKeys[key]] / 1e9;
        else entry[key] = (+row[rawK] / basePrice[key]) * 100;
      });
      return entry;
    });
  }, [priceMode, pricePeriod, safeBaseIdx, priceFiltered]);

  // Blockfrost wallet add
  const addWallet = useCallback(async () => {
    const addr = newAddr.trim();
    if (!addr || !bfKey) { setBfError("Blockfrost API\\u30ad\\u30fc\\u3092\\u8a2d\\u5b9a\\u3057\\u3066\\u304f\\u3060\\u3055\\u3044"); setBfStatus("error"); return; }
    let stakeAddr = addr;
    if (addr.startsWith("addr")) {
      setBfStatus("loading");
      try { const info: any = await bfGet(`/addresses/${addr}`, bfKey); if (!info?.stake_address) throw new Error("stake address not found"); stakeAddr = info.stake_address; } catch (e: any) { setBfStatus("error"); setBfError(e.message); return; }
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
      return Object.values(byEpoch).sort((a: any, b: any) => a.epoch - b.epoch).slice(-30).map((r: any) => ({ ...r, usd: +(r.ada * P.ADA.usd).toFixed(2), jpy: +(r.ada * P.ADA.jpy).toFixed(0) }));
    }
    return Array.from({ length: 20 }, (_, i) => ({ epoch: 500 + i, ada: +(Math.random() * 15 + 3).toFixed(2), usd: 0, jpy: 0 }));
  }, [walletRewards, P]);

  const exportCSV = () => {
    const c = "Epoch,ADA,USD,JPY\\n" + rewardData.map((r: any) => `${r.epoch},${r.ada},${r.usd},${r.jpy}`).join("\\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([c])); a.download = "rewards.csv"; a.click();
  };

  const PeriodBtns = ({value, onChange}: {value: string; onChange: (v: string) => void}) => (
    <div className="flex items-center gap-1">
      {[{k:"7d",l:"7d"},{k:"1m",l:"1M"},{k:"all",l:"All"}].map(p => (
        <Btn key={p.k} active={value===p.k} onClick={()=>onChange(p.k)} color="#6366F1">{p.l}</Btn>
      ))}
    </div>
  );

  const tabs = [
    { id: "portfolio", label: "Portfolio" },
    { id: "wallets", label: "Wallets" },
    { id: "rewards", label: "Rewards" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">\\u20b3</div>
          <span className="font-bold text-sm">CardanoWatch</span>
          {isLive ? (
            <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">Live</span>
          ) : (
            <span className="text-xs bg-yellow-900/40 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-800/50">Mock Data</span>
          )}
          {apiStatus === "loading" && <span className="text-xs text-yellow-400 animate-pulse">Loading...</span>}
          {lastFetch && <span className="text-xs text-gray-600">Updated: {lastFetch.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHide(!hide)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 text-xs">{hide ? "Show" : "Hide"}</button>
          <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 text-xs">Refresh</button>
        </div>
      </div>

      {/* Tier banner */}
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
            <div className="text-2xl font-bold">{H(`\\u20b3 ${fmt(totalAda)}`)}</div>
            <div className="text-sm text-green-400">{H(`$${fmt(totalAda * P.ADA.usd, 2)}`)}</div>
            <div className="text-xs text-gray-500">{H(`\\u00a5${fmt(totalAda * P.ADA.jpy)}`)}</div>
          </div>
          {next && (
            <div className="text-right border-l border-gray-700 pl-4">
              <div className="text-xs text-gray-500">Next Tier</div>
              <div className="text-sm">{next.emoji} {next.name}</div>
              <div className="text-xs text-blue-400">{fmt(next.min - totalAda)} ADA needed</div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Portfolio ═══ */}
      {tab === "portfolio" && (
        <div className="space-y-4">
          {/* Asset Price Table */}
          <div className="bg-gray-800 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-gray-500 mr-1">Periods:</span>
              {CHANGE_PERIODS.map(p => (
                <Btn key={p.key} active={visiblePeriods[p.key]} onClick={() => setVisiblePeriods({...visiblePeriods, [p.key]: !visiblePeriods[p.key]})} color="#4B5563">{p.label}</Btn>
              ))}
              <span className="text-xs text-gray-500 ml-2 mr-1">H/L:</span>
              {["24h","7d","1m","all"].map(p => (
                <Btn key={p} active={hlPeriod===p} onClick={()=>setHlPeriod(p)} color="#6366F1">{p}</Btn>
              ))}
            </div>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                <th className="pb-1.5 font-medium">Asset</th>
                <th className="pb-1.5 font-medium text-right">Price</th>
                {CHANGE_PERIODS.filter(p => visiblePeriods[p.key]).map(p => <th key={p.key} className="pb-1.5 font-medium text-right">{p.label}</th>)}
                <th className="pb-1.5 font-medium text-right">High</th>
                <th className="pb-1.5 font-medium text-right">Low</th>
                <th className="pb-1.5 font-medium text-right">MCap</th>
              </tr></thead>
              <tbody>
                {Object.entries(P).filter(([k]) => CG_IDS[k]).map(([key, price]: [string, any]) => {
                  const chg = PC[key] || {};
                  const hl = PRICE_HL[key]?.[hlPeriod];
                  return (
                    <tr key={key} className={`border-b border-gray-700/50 ${key === "ADA" ? "bg-blue-900/10" : "hover:bg-gray-700/30"}`}>
                      <td className="py-2 font-bold text-white">{key}</td>
                      <td className="py-2 text-right text-white font-mono">${price.usd >= 1 ? fmt(price.usd, 2) : price.usd.toFixed(4)}</td>
                      {CHANGE_PERIODS.filter(p => visiblePeriods[p.key]).map(p => (
                        <td key={p.key} className="py-2 text-right">
                          <span className={`${(chg[p.key] || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {(chg[p.key] || 0) > 0 ? "+" : ""}{chg[p.key] || 0}%
                          </span>
                        </td>
                      ))}
                      <td className="py-2 text-right text-green-300 font-mono">{hl ? `$${hl.hi}` : "\\u2014"}</td>
                      <td className="py-2 text-right text-red-300 font-mono">{hl ? `$${hl.lo}` : "\\u2014"}</td>
                      <td className="py-2 text-right text-gray-400">${price.mcap ? (price.mcap / 1e9).toFixed(1) + "B" : "\\u2014"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Price Comparison Chart */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-sm font-bold text-gray-300">Price Analysis</span>
              <div className="flex items-center gap-2 flex-wrap">
                <PeriodBtns value={pricePeriod} onChange={setPricePeriod}/>
                <div className="flex items-center gap-1">
                  {[{k:"indexed",l:"Indexed"},{k:"mcap",l:"MCap"},{k:"price",l:"Price"}].map(m => (
                    <Btn key={m.k} active={priceMode===m.k} onClick={()=>setPriceMode(m.k)} color="#A855F7">{m.l}</Btn>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    {k:"adaPrice",l:"ADA",c:"#818CF8"},{k:"btcPrice",l:"BTC",c:"#FB923C"},
                    {k:"ethPrice",l:"ETH",c:"#627EEA"},{k:"solPrice",l:"SOL",c:"#00FFA3"},
                    {k:"xrpPrice",l:"XRP",c:"#A8B8C8"},{k:"goldPrice",l:"Gold",c:"#FFD700"},
                  ].map(c => (
                    <Btn key={c.k} active={showOverlay[c.k]} onClick={()=>setShowOverlay({...showOverlay,[c.k]:!showOverlay[c.k]})} color={c.c}>{c.l}</Btn>
                  ))}
                </div>
              </div>
            </div>
            {priceMode === "indexed" && (
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="text-xs text-gray-500">Base:</span>
                <span className="text-xs text-white font-bold bg-purple-600/30 px-2 py-0.5 rounded">{priceFiltered[safeBaseIdx]?.date || "\\u2014"} = 100</span>
                <input type="range" min={0} max={priceFiltered.length - 1} value={safeBaseIdx} onChange={e => setBaseIdx(+e.target.value)} className="flex-1 h-1 accent-purple-500"/>
              </div>
            )}
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
                <XAxis dataKey="date" tick={{fill:"#6B7280",fontSize:9}} tickLine={false} interval={Math.max(1,Math.floor(priceChartData.length/8))}/>
                <YAxis tick={{fill:"#6B7280",fontSize:9}} tickLine={false} tickFormatter={(v: number) => {
                  if (priceMode === "indexed") return `${v >= 100 ? "+" : ""}${(v - 100).toFixed(0)}%`;
                  if (priceMode === "mcap") return v >= 1000 ? `$${(v/1000).toFixed(1)}T` : `$${v.toFixed(0)}B`;
                  return v >= 10000 ? `$${(v/1000).toFixed(0)}k` : v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(4)}`;
                }} width={55}/>
                {priceMode === "indexed" && <ReferenceLine y={100} stroke="#6366F1" strokeDasharray="4 4"/>}
                <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}}/>
                {showOverlay.adaPrice && <Line type="monotone" dataKey="adaPrice" stroke="#818CF8" strokeWidth={2} dot={false}/>}
                {showOverlay.btcPrice && <Line type="monotone" dataKey="btcPrice" stroke="#FB923C" strokeWidth={2} dot={false}/>}
                {showOverlay.ethPrice && <Line type="monotone" dataKey="ethPrice" stroke="#627EEA" strokeWidth={2} dot={false}/>}
                {showOverlay.solPrice && <Line type="monotone" dataKey="solPrice" stroke="#00FFA3" strokeWidth={2} dot={false}/>}
                {showOverlay.xrpPrice && <Line type="monotone" dataKey="xrpPrice" stroke="#A8B8C8" strokeWidth={2} dot={false}/>}
                {showOverlay.goldPrice && <Line type="monotone" dataKey="goldPrice" stroke="#FFD700" strokeWidth={2} dot={false}/>}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
              {showOverlay.adaPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#818CF8"}}/>ADA</span>}
              {showOverlay.btcPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FB923C"}}/>BTC</span>}
              {showOverlay.ethPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#627EEA"}}/>ETH</span>}
              {showOverlay.solPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#00FFA3"}}/>SOL</span>}
              {showOverlay.xrpPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#A8B8C8"}}/>XRP</span>}
              {showOverlay.goldPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FFD700"}}/>Gold</span>}
            </div>
          </div>

          {/* All Tiers Reference */}
          <details className="bg-gray-800 rounded-xl">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-200">All 35 Tiers Reference</summary>
            <div className="px-4 pb-4">
              {MAJOR_TIERS.map((mt, mi) => (
                <div key={mi} className="mb-2">
                  <div className="text-xs font-bold px-2 py-1 rounded mb-1" style={{color: mt.color, backgroundColor: mt.color + \'15\'}}>{mt.emoji} {mt.name} <span className="text-gray-500 font-normal ml-1">{mt.range}</span></div>
                  <div className="space-y-0.5">
                    {TIERS.filter(t => t.major === mi).map(t => {
                      const cur = t.name === tier.name;
                      return (
                        <div key={t.name} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${cur ? "bg-gray-700 border border-blue-500/60" : "hover:bg-gray-700/50"}`}>
                          <span className="text-gray-500 font-bold w-6">{t.sub}</span>
                          <span className="text-sm w-5">{t.emoji}</span>
                          <span className="font-bold w-32" style={{color: t.color}}>{t.name}</span>
                          <span className="text-gray-500 flex-1">{t.max === Infinity ? `${fmtK(t.min)}+` : `${fmtK(t.min)}~${fmtK(t.max)}`}</span>
                          <span className="text-gray-600">{t.desc}</span>
                          {cur && <span className="bg-blue-600 text-white px-1 py-0.5 rounded text-xs">YOU</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* ═══ Tab: Wallets ═══ */}
      {tab === "wallets" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Add Wallet (Blockfrost)</h3>
            <div className="flex gap-2 mb-2">
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Wallet name" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-36"/>
              <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="stake1... or addr1..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600"/>
              <button onClick={addWallet} disabled={bfStatus==="loading"} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium">
                {bfStatus==="loading" ? "Loading..." : "+ Add"}
              </button>
            </div>
            {bfStatus === "error" && bfError && <div className="text-xs text-red-400 mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1">{bfError}</div>}
            {bfStatus === "ok" && <div className="text-xs text-green-400 mb-2">Wallet data loaded from Blockfrost</div>}

            <h3 className="text-sm font-bold text-gray-300 mb-2 mt-4">Manual Entry (Exchanges)</h3>
            <div className="flex gap-2 mb-3">
              <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="Exchange name" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-32"/>
              <input value={mAmt} onChange={e=>setMAmt(e.target.value)} placeholder="ADA amount" type="number" className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-28"/>
              <button onClick={addManual} className="bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium">+ Manual</button>
            </div>
            <div className="text-xs text-gray-600 mb-3">All data stored locally only</div>

            {/* Wallet list */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                  <th className="pb-1.5 font-medium">Type</th><th className="pb-1.5 font-medium">Name</th><th className="pb-1.5 font-medium text-right">Balance</th><th className="pb-1.5 font-medium">Pool</th><th className="pb-1.5 font-medium">DRep</th><th className="pb-1.5 font-medium text-right">Rewards</th><th className="pb-1.5 font-medium w-8"></th>
                </tr></thead>
                <tbody>
                  {wallets.map((w: any) => (
                    <tr key={w.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="py-1.5"><span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">Wallet</span></td>
                      <td className="py-1.5 text-white font-medium">{w.name}</td>
                      <td className="py-1.5 text-right text-white font-bold">{H(`\\u20b3 ${fmt(w.bal)}`)}</td>
                      <td className="py-1.5 text-blue-400 font-bold">[{w.pool}]</td>
                      <td className="py-1.5 text-purple-400">{w.drep}</td>
                      <td className="py-1.5 text-right text-green-400">\\u20b3 {fmt(w.rew, 1)}</td>
                      <td className="py-1.5"><button onClick={() => setWallets(wallets.filter((x: any) => x.id !== w.id))} className="text-red-400 hover:text-red-300 text-xs">\\u00d7</button></td>
                    </tr>
                  ))}
                  {manual.map((e: any) => (
                    <tr key={`m-${e.id}`} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="py-1.5"><span className="text-xs bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded">Manual</span></td>
                      <td className="py-1.5 text-white font-medium">{e.name}</td>
                      <td className="py-1.5 text-right text-white font-bold">{H(`\\u20b3 ${fmt(e.amount)}`)}</td>
                      <td className="py-1.5 text-gray-600">\\u2014</td><td className="py-1.5 text-gray-600">\\u2014</td><td className="py-1.5 text-gray-600">\\u2014</td>
                      <td className="py-1.5"><button onClick={() => setManual(manual.filter((x: any) => x.id !== e.id))} className="text-red-400 hover:text-red-300 text-xs">\\u00d7</button></td>
                    </tr>
                  ))}
                  {wallets.length === 0 && manual.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">No wallets added. Use the form above to add a wallet via Blockfrost or manually.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Tab: Rewards ═══ */}
      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-300">Staking Rewards</span>
              <button onClick={exportCSV} className="text-xs bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded">CSV Export</button>
            </div>
            <div className="flex gap-6 text-xs mb-3">
              <span className="text-gray-500">Total Rewards: <span className="text-green-400 font-bold">{H(`\\u20b3 ${fmt(wallets.reduce((s: number, w: any) => s + (w.rew || 0), 0), 1)}`)}</span></span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rewardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
                <XAxis dataKey="epoch" tick={{fill:"#6B7280",fontSize:8}} tickLine={false}/>
                <YAxis tick={{fill:"#6B7280",fontSize:8}} tickLine={false} width={30}/>
                <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v: any)=>[`\\u20b3 ${v}`,"Reward"]}/>
                <Bar dataKey="ada" fill="#10B981" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ Tab: Settings ═══ */}
      {tab === "settings" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Blockfrost API</h3>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Project ID (mainnet)</label>
              <input type="text" value={bfKey} onChange={e => setBfKey(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white" placeholder="mainnetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
              <span className="text-xs text-gray-600 mt-1 block">Free tier: 50,000 requests/day at blockfrost.io</span>
            </div>

            <h3 className="text-sm font-bold text-gray-300 mb-3 mt-6">Price Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">USD/JPY Rate</label>
                <input type="number" value={jpyRate} onChange={e => setJpyRate(+e.target.value || 150)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white"/>
              </div>
              <div className="flex items-end">
                <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded text-xs font-medium w-full">
                  {apiStatus==="loading" ? "Fetching..." : "Fetch Live Prices"}
                </button>
              </div>
            </div>
            {apiStatus === "ok" && <div className="mt-2 text-xs text-green-400">Prices updated at {lastFetch?.toLocaleString()}</div>}
            <div className="mt-4 text-xs text-gray-600">Prices from CoinGecko (free API, 30 req/min). Wallet data from Blockfrost. All API keys stored locally only.</div>
          </div>
        </div>
      )}
    </div>
  );
}
''')
log(f"CardanoWatch component created: {cw_file}")

# ============================================================
# Step 3: Replace ADA Holder Dashboard page
# ============================================================
print("\\n" + "=" * 60)
print("STEP 3: Replacing ADA Holder Dashboard page")
print("=" * 60)

holder_page = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/holder/page.tsx")
os.makedirs(os.path.dirname(holder_page), exist_ok=True)

# Backup existing
if os.path.exists(holder_page):
    shutil.copy2(holder_page, holder_page + ".bak")
    log("Backed up existing holder page")

with open(holder_page, "w") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const CardanoWatch = dynamic(() => import("@/components/CardanoWatch"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function truncHash(h: string, n = 8) {
  if (!h || h.length <= n * 2) return h || "";
  return h.slice(0, n) + "..." + h.slice(-n);
}

export default function HolderDashboard() {
  const [view, setView] = useState<"cardanowatch" | "onchain">("cardanowatch");
  const [onchainData, setOnchainData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view === "onchain" && !onchainData) {
      setLoading(true);
      fetch(`${API}/dashboard/holder`)
        .then(r => r.json())
        .then(d => { setOnchainData(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [view, onchainData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ADA Holder Dashboard</h1>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          <button onClick={() => setView("cardanowatch")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === "cardanowatch" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
            CardanoWatch
          </button>
          <button onClick={() => setView("onchain")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === "onchain" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
            On-Chain Data
          </button>
        </div>
      </div>

      {view === "cardanowatch" && <CardanoWatch />}

      {view === "onchain" && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          )}
          {onchainData && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Current Epoch", value: onchainData.stats?.epoch ?? "—", color: "text-blue-400" },
                  { label: "Total Stake", value: onchainData.stats?.totalStake ? `₳ ${Number(onchainData.stats.totalStake).toLocaleString()}` : "—", color: "text-green-400" },
                  { label: "Active Pools", value: onchainData.stats?.activePools ?? "—", color: "text-purple-400" },
                  { label: "Delegators", value: onchainData.stats?.delegators ? Number(onchainData.stats.delegators).toLocaleString() : "—", color: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Top Pools */}
              {onchainData.topPools && onchainData.topPools.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-300 mb-3">Top Pools by Stake</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                        <th className="pb-1.5 font-medium">Pool</th>
                        <th className="pb-1.5 font-medium text-right">Stake (ADA)</th>
                        <th className="pb-1.5 font-medium text-right">Blocks</th>
                      </tr></thead>
                      <tbody>
                        {onchainData.topPools.map((p: any, i: number) => (
                          <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                            <td className="py-1.5 font-mono text-gray-300">{truncHash(String(p.pool_hash || p.view || ""), 12)}</td>
                            <td className="py-1.5 text-right text-white font-bold">{Number(p.stake || 0).toLocaleString()}</td>
                            <td className="py-1.5 text-right text-gray-400">{p.blocks ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stake Distribution */}
              {onchainData.stakeDistribution && onchainData.stakeDistribution.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-300 mb-3">Stake Distribution</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                        <th className="pb-1.5 font-medium">Range</th>
                        <th className="pb-1.5 font-medium text-right">Count</th>
                      </tr></thead>
                      <tbody>
                        {onchainData.stakeDistribution.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-700/50">
                            <td className="py-1.5 text-gray-300">{d.range || d.label || `Range ${i+1}`}</td>
                            <td className="py-1.5 text-right text-white">{Number(d.count || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          {!loading && !onchainData && (
            <div className="text-center text-gray-500 py-8">Failed to load on-chain data</div>
          )}
        </div>
      )}
    </div>
  );
}
''')
log("Holder dashboard page replaced with CardanoWatch integration")

# ============================================================
# Step 4: Build & Deploy
# ============================================================
print("\\n" + "=" * 60)
print("STEP 4: Building frontend")
print("=" * 60)

dotNext = os.path.join(PROJECT_FE, ".next")
if os.path.isdir(dotNext):
    shutil.rmtree(dotNext)

code, out, errs = run("npm run build 2>&1", timeout=300)
if code != 0:
    err("BUILD FAILED!")
    combined = out + errs
    for line in combined.strip().split("\\n")[-40:]:
        print(f"  {line}")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(10)

# ============================================================
# Step 5: Test
# ============================================================
print("\\n" + "=" * 60)
print("STEP 5: Testing")
print("=" * 60)

pages = ["dashboard","dashboard/holder","dashboard/spo","dashboard/cc","dashboard/drep",
         "dashboard/governance","dashboard/chain","dashboard/portfolio","dashboard/developer",
         "dashboard/drep/votes-matrix",
         "explorer","explorer/chain","explorer/staking","explorer/governance",
         "explorer/tokens","explorer/analytics","explorer/addresses","live","search"]
ok = fail = 0
for p in pages:
    _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
    s = out.strip().strip("'")
    if s.startswith("2"):
        log(f"  /{p} => {s}")
        ok += 1
    else:
        warn(f"  /{p} => {s}")
        fail += 1

print(f"\\n  {ok}/{len(pages)} OK")
if fail == 0:
    log("ALL PAGES PASSING!")
else:
    warn(f"{fail} pages have issues")

print("\\n" + "=" * 60)
log("DONE! CardanoWatch integrated into ADA Holder Dashboard")
print("  Visit: https://adatool.net/dashboard/holder")
print("=" * 60)
