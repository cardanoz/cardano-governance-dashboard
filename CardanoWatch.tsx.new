"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from "recharts";
import { Wallet, TrendingUp, Award, Bell, Download, Plus, Trash2, Eye, EyeOff, Mail, RefreshCw, Database, Copy, ArrowUpRight, ArrowDownRight, Star, Shield, Coins, ChevronDown, ChevronUp, Settings, Activity, Loader, Wifi, WifiOff } from "lucide-react";

// ══════════════════════════════════════════════
// 35-Tier System (7 Major Tiers × 4-6 Sub-Tiers)
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
  // 大ティア1: 神話・伝説級 (5M+)
  { name: "ポセイドン", emoji: "🔱", min: 10000000, max: Infinity, color: "#FFD700", desc: "海神", major: 0, sub: "S+" },
  { name: "リヴァイアサン", emoji: "🐉", min: 8000000, max: 10000000, color: "#FCD34D", desc: "海の怪物", major: 0, sub: "S" },
  { name: "クラーケン", emoji: "🦑", min: 6000000, max: 8000000, color: "#F59E0B", desc: "深淵の主", major: 0, sub: "A" },
  { name: "ヨルムンガンド", emoji: "🐍", min: 5000000, max: 6000000, color: "#D97706", desc: "世界蛇", major: 0, sub: "B" },
  // 大ティア2: 古代生命級 (2M~5M)
  { name: "メガロドン", emoji: "🦷", min: 4000000, max: 5000000, color: "#8B5CF6", desc: "古代巨大サメ", major: 1, sub: "S" },
  { name: "ダンクルオステウス", emoji: "🛡️", min: 3500000, max: 4000000, color: "#7C3AED", desc: "装甲魚", major: 1, sub: "A" },
  { name: "リードシクティス", emoji: "🐋", min: 2500000, max: 3500000, color: "#6D28D9", desc: "史上最大硬骨魚", major: 1, sub: "B" },
  { name: "バシロサウルス", emoji: "🦕", min: 2000000, max: 2500000, color: "#5B21B6", desc: "原始クジラ", major: 1, sub: "C" },
  // 大ティア3: クジラ級 (500K~2M)
  { name: "シロナガスクジラ", emoji: "🐳", min: 1500000, max: 2000000, color: "#3B82F6", desc: "Blue Whale", major: 2, sub: "S" },
  { name: "マッコウクジラ", emoji: "🐋", min: 1000000, max: 1500000, color: "#2563EB", desc: "Sperm Whale", major: 2, sub: "A" },
  { name: "ザトウクジラ", emoji: "🐋", min: 800000, max: 1000000, color: "#1D4ED8", desc: "Humpback", major: 2, sub: "B" },
  { name: "ジンベエザメ", emoji: "🦈", min: 650000, max: 800000, color: "#1E40AF", desc: "Whale Shark", major: 2, sub: "C" },
  { name: "ホオジロザメ", emoji: "🦈", min: 500000, max: 650000, color: "#1E3A8A", desc: "Great White", major: 2, sub: "D" },
  // 大ティア4: 中型魚級 (100K~500K)
  { name: "マグロ", emoji: "🐟", min: 400000, max: 500000, color: "#06B6D4", desc: "Tuna", major: 3, sub: "S" },
  { name: "カジキ", emoji: "⚔️", min: 300000, max: 400000, color: "#0891B2", desc: "Marlin", major: 3, sub: "A" },
  { name: "バラクーダ", emoji: "🐡", min: 200000, max: 300000, color: "#0E7490", desc: "Barracuda", major: 3, sub: "B" },
  { name: "サーモン", emoji: "🍣", min: 150000, max: 200000, color: "#155E75", desc: "Salmon", major: 3, sub: "C" },
  { name: "タイ", emoji: "🐡", min: 120000, max: 150000, color: "#164E63", desc: "Sea Bream", major: 3, sub: "D" },
  { name: "アジ", emoji: "🐟", min: 100000, max: 120000, color: "#134E4A", desc: "Horse Mackerel", major: 3, sub: "E" },
  // 大ティア5: 小型魚級 (10K~100K)
  { name: "クマノミ", emoji: "🐠", min: 70000, max: 100000, color: "#34D399", desc: "Clownfish", major: 4, sub: "S" },
  { name: "ネオンテトラ", emoji: "💎", min: 50000, max: 70000, color: "#10B981", desc: "Neon Tetra", major: 4, sub: "A" },
  { name: "タツノオトシゴ", emoji: "🐴", min: 30000, max: 50000, color: "#059669", desc: "Seahorse", major: 4, sub: "B" },
  { name: "メダカ", emoji: "🐟", min: 20000, max: 30000, color: "#047857", desc: "Killifish", major: 4, sub: "C" },
  { name: "グッピー", emoji: "🐟", min: 10000, max: 20000, color: "#065F46", desc: "Guppy", major: 4, sub: "D" },
  // 大ティア6: 甲殻類・小生物級 (1K~10K)
  { name: "イセエビ", emoji: "🦞", min: 7000, max: 10000, color: "#F97316", desc: "Lobster", major: 5, sub: "S" },
  { name: "カニ", emoji: "🦀", min: 5000, max: 7000, color: "#EA580C", desc: "Crab", major: 5, sub: "A" },
  { name: "エビ", emoji: "🦐", min: 3000, max: 5000, color: "#DC2626", desc: "Shrimp", major: 5, sub: "B" },
  { name: "ヤドカリ", emoji: "🐚", min: 2000, max: 3000, color: "#B91C1C", desc: "Hermit Crab", major: 5, sub: "C" },
  { name: "フジツボ", emoji: "🪨", min: 1000, max: 2000, color: "#991B1B", desc: "Barnacle", major: 5, sub: "D" },
  // 大ティア7: プランクトン・微生物級 (~1K)
  { name: "オキアミ", emoji: "🦐", min: 500, max: 1000, color: "#9CA3AF", desc: "Krill", major: 6, sub: "S" },
  { name: "ミジンコ", emoji: "🔍", min: 200, max: 500, color: "#6B7280", desc: "Daphnia", major: 6, sub: "A" },
  { name: "プランクトン", emoji: "🫧", min: 50, max: 200, color: "#4B5563", desc: "Plankton", major: 6, sub: "B" },
  { name: "アメーバ", emoji: "🔬", min: 10, max: 50, color: "#374151", desc: "Amoeba", major: 6, sub: "C" },
  { name: "バクテリア", emoji: "🧫", min: 1, max: 10, color: "#1F2937", desc: "Bacteria", major: 6, sub: "D" },
  { name: "ウイルス", emoji: "🧬", min: 0, max: 1, color: "#111827", desc: "Virus", major: 6, sub: "E" },
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
const CG_SUPPLY = { ADA: 35e9, BTC: 19.8e6, ETH: 120.4e6, SOL: 430e6, XRP: 55e9, GOLD: 5.3e6 }; // approx circulating for mcap

// Fetch USD/JPY rate from CoinGecko exchange_rates
async function fetchJpyRate(cgKey) {
  try {
    const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
    const url = `${CG_BASE}/simple/price?ids=usd-coin&vs_currencies=jpy${keyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.["usd-coin"]?.jpy || null; // USDC/JPY ≈ USD/JPY
  } catch { return null; }
}

// Fetch current prices + changes from CoinGecko /coins/markets
async function fetchMarkets(jpyRate, cgKey) {
  const ids = Object.values(CG_IDS).join(",");
  const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d,200d,1y&sparkline=false&order=market_cap_desc${keyParam}`;
  const res = await fetch(url);
  if (!res.ok) {
    const hint = res.status === 429 ? "（レート制限）少し待ってから再取得してください"
      : res.status === 403 ? "（認証エラー）CoinGecko Demo APIキーを設定してください → 高度な設定"
      : "";
    throw new Error(`CoinGecko markets ${res.status} ${hint}`);
  }
  const data = await res.json();
  const P = {}, PC = {}, HL = {};
  const idToKey = Object.fromEntries(Object.entries(CG_IDS).map(([k, v]) => [v, k]));
  for (const c of data) {
    const key = idToKey[c.id]; if (!key) continue;
    const btcRate = data.find(x => x.id === "bitcoin")?.current_price || 86750;
    P[key] = { usd: c.current_price, jpy: c.current_price * jpyRate, btc: c.current_price / btcRate, mcap: c.market_cap };
    PC[key] = {
      "24h": +(c.price_change_percentage_24h_in_currency || c.price_change_percentage_24h || 0).toFixed(1),
      "7d": +(c.price_change_percentage_7d_in_currency || c.price_change_percentage_7d || 0).toFixed(1),
      "1m": +(c.price_change_percentage_30d_in_currency || c.price_change_percentage_30d || 0).toFixed(1),
      "3m": 0, // 90日履歴から後で計算
      "6m": +(c.price_change_percentage_200d_in_currency || c.price_change_percentage_200d || 0).toFixed(1), // 200d ≈ 6m
      "1y": +(c.price_change_percentage_1y_in_currency || c.price_change_percentage_1y || 0).toFixed(1),
    };
    HL[key] = {
      "24h": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price },
      "7d": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price }, // CG only has 24h h/l natively
      "1m": { hi: c.high_24h || c.current_price, lo: c.low_24h || c.current_price },
      all: { hi: c.ath || c.current_price, lo: c.atl || 0 },
    };
  }
  return { P, PC, HL };
}

// Fetch 90-day price history from CoinGecko /coins/{id}/market_chart
// Note: interval=daily is PAID ONLY. Free/demo tier uses auto-granularity (90days → hourly).
// We fetch raw data then aggregate to daily.
async function fetchHistory(id, cgKey) {
  const keyParam = cgKey ? `&x_cg_demo_api_key=${cgKey}` : "";
  const url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=90${keyParam}`;
  const res = await fetch(url);
  if (!res.ok) {
    const hint = res.status === 429 ? "レート制限" : res.status === 403 ? "認証エラー" : "";
    throw new Error(`CoinGecko history ${id} ${res.status} ${hint}`);
  }
  const data = await res.json();
  const raw = data.prices || [];
  if (raw.length === 0) return [];
  // Aggregate hourly data to daily (take last price per day)
  const dailyMap = {};
  for (const [ts, price] of raw) {
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    dailyMap[key] = { ts, price, d };
  }
  const supply = CG_SUPPLY[Object.entries(CG_IDS).find(([,v])=>v===id)?.[0]] || 1;
  return Object.values(dailyMap).sort((a,b) => a.ts - b.ts).map(({d, price, ts}) => ({
    date: `${d.getMonth()+1}/${d.getDate()}`, price, ts, mcap: price * supply,
  }));
}

// Fetch ACWI (MSCI ACWI ETF) from Alpha Vantage (optional, needs free API key)
async function fetchACWI(avKey) {
  if (!avKey) return null;
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=ACWI&outputsize=compact&apikey=${avKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const ts = data["Time Series (Daily)"];
  if (!ts) return null;
  return Object.entries(ts).sort(([a],[b]) => a.localeCompare(b)).slice(-90).map(([dateStr, v]) => {
    const d = new Date(dateStr);
    return { date: `${d.getMonth()+1}/${d.getDate()}`, price: +v["4. close"], ts: d.getTime() };
  });
}

// Build COMBINED_HIST from live data
// If realBalances is provided (from Blockfrost wallets), use actual ADA balance
// CNT token balances use current snapshot (historical balance tracking requires DBSync)
function buildCombinedHist(histMap, acwiHist, realBalances = null) {
  // Use ADA history as date backbone (90 points)
  const adaH = histMap.ADA || [];
  const len = adaH.length;
  if (len === 0) return null;
  // Build lookup maps by date string for other assets
  const lookup = {};
  for (const [key, arr] of Object.entries(histMap)) {
    lookup[key] = {};
    for (const pt of arr) lookup[key][pt.date] = pt;
  }
  const acwiLookup = {};
  if (acwiHist) for (const pt of acwiHist) acwiLookup[pt.date] = pt;

  // Use real balances from wallets if available (constant snapshot over time, since
  // historical balance tracking requires DBSync or indexer)
  const hasReal = realBalances && realBalances.totalAda > 0;
  const rADA = hasReal ? realBalances.totalAda : 0;
  const rNIGHT = hasReal ? (realBalances.tokens?.NIGHT || 0) : 0;
  const rSNEK = hasReal ? (realBalances.tokens?.SNEK || 0) : 0;
  const rMIN = hasReal ? (realBalances.tokens?.MIN || 0) : 0;

  return adaH.map((adaPt, i) => {
    const date = adaPt.date;
    // Balances: use real wallet data if available, otherwise 0 (don't fake it)
    const rawADA = hasReal ? rADA : 0;
    const rawNIGHT = hasReal ? rNIGHT : 0;
    const rawSNEK = hasReal ? rSNEK : 0;
    const rawMIN = hasReal ? rMIN : 0;
    // Live prices
    const pADA = adaPt.price;
    const pNIGHT = 0.0012; // CNT tokens: no CoinGecko listing → mock price
    const pSNEK = 0.0045;
    const pMIN = 0.035;
    const btcPrice = lookup.BTC?.[date]?.price || 86750;
    const ethPrice = lookup.ETH?.[date]?.price || 2800;
    const solPrice = lookup.SOL?.[date]?.price || 140;
    const xrpPrice = lookup.XRP?.[date]?.price || 2.1;
    const goldPrice = lookup.GOLD?.[date]?.price || 2850;
    const acwiPrice = acwiLookup[date]?.price || (acwiHist?.[Math.min(i, (acwiHist?.length||1)-1)]?.price) || 110;
    // USD values
    const uADA = rawADA * pADA, uNIGHT = rawNIGHT * pNIGHT, uSNEK = rawSNEK * pSNEK, uMIN = rawMIN * pMIN;
    // Market caps
    const mcADA = adaPt.mcap || pADA * CG_SUPPLY.ADA;
    const mcBTC = lookup.BTC?.[date]?.mcap || btcPrice * CG_SUPPLY.BTC;
    const mcETH = lookup.ETH?.[date]?.mcap || ethPrice * CG_SUPPLY.ETH;
    const mcSOL = lookup.SOL?.[date]?.mcap || solPrice * CG_SUPPLY.SOL;
    const mcXRP = lookup.XRP?.[date]?.mcap || xrpPrice * CG_SUPPLY.XRP;
    const mcGold = lookup.GOLD?.[date]?.mcap || goldPrice * CG_SUPPLY.GOLD;
    const mcACWI = acwiPrice * 1; // ETF NAV, not market cap in traditional sense
    return {
      date, rawADA, rawNIGHT, rawSNEK, rawMIN,
      pADA, pNIGHT, pSNEK, pMIN,
      uADA, uNIGHT, uSNEK, uMIN, uTOTAL: uADA + uNIGHT + uSNEK + uMIN,
      btcPrice, ethPrice, solPrice, xrpPrice, goldPrice, acwiPrice,
      mcADA, mcBTC, mcETH, mcSOL, mcXRP, mcGold, mcACWI,
    };
  });
}

// ══════════════════════════════════════════════
// Blockfrost API Integration
// ══════════════════════════════════════════════
const BF_BASE = "https://cardano-mainnet.blockfrost.io/api/v0";

async function bfGet(path, bfKey) {
  const res = await fetch(`${BF_BASE}${path}`, { headers: { project_id: bfKey } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blockfrost ${path} → ${res.status}`);
  return res.json();
}

// /accounts/{stake_address} → controlled_amount, rewards_sum, withdrawals_sum, pool_id, drep_id
async function bfAccount(stakeAddr, bfKey) {
  const data = await bfGet(`/accounts/${stakeAddr}`, bfKey);
  if (!data) return null;
  return {
    totalLovelace: Number(data.controlled_amount || "0"),
    rewardsSum: Number(data.rewards_sum || "0"),
    withdrawalsSum: Number(data.withdrawals_sum || "0"),
    poolId: data.pool_id || null,
    drepId: data.drep_id || null,
    active: data.active,
  };
}

// /accounts/{stake_address}/addresses → list of associated addresses
async function bfAddresses(stakeAddr, bfKey) {
  const data = await bfGet(`/accounts/${stakeAddr}/addresses`, bfKey);
  return (data || []).map(d => d.address);
}

// /accounts/{stake_address}/addresses/assets → native tokens
async function bfAssets(stakeAddr, bfKey) {
  const data = await bfGet(`/accounts/${stakeAddr}/addresses/assets`, bfKey);
  return data || [];
}

// /pools/{pool_id}/metadata → pool ticker/name
async function bfPoolMeta(poolId, bfKey) {
  if (!poolId) return { ticker: "—", name: "" };
  const data = await bfGet(`/pools/${poolId}/metadata`, bfKey);
  if (!data) return { ticker: poolId.slice(0, 8), name: "" };
  return { ticker: data.ticker || poolId.slice(0, 8), name: data.name || "" };
}

// /pools/{pool_id} → pool stats (pledge, margin, blocks, stake, etc.)
async function bfPoolInfo(poolId, bfKey) {
  if (!poolId) return null;
  const data = await bfGet(`/pools/${poolId}`, bfKey);
  if (!data) return null;
  return {
    declaredPledge: Number(data.declared_pledge || "0") / 1e6, // ADA
    livePledge: Number(data.live_pledge || "0") / 1e6,
    liveStake: Number(data.live_stake || "0") / 1e6,
    liveDelegators: Number(data.live_delegators || 0),
    blocksMinted: Number(data.blocks_minted || 0),
    marginCost: Number(data.margin_cost || 0), // 0.0〜1.0
    fixedCost: Number(data.fixed_cost || "340000000") / 1e6, // ADA
    activeSize: Number(data.active_size || 0), // fraction of total
    liveSaturation: Number(data.live_saturation || 0), // 0.0〜1.0
    retiring: data.retirement_epoch || null,
  };
}

// /pools/{pool_id}/history → per-epoch pool performance (blocks, delegators, stake)
async function bfPoolHistory(poolId, bfKey, count = 10) {
  if (!poolId) return [];
  const data = await bfGet(`/pools/${poolId}/history?count=${count}&order=desc`, bfKey);
  return (data || []).map(h => ({
    epoch: h.epoch,
    blocks: h.blocks,
    activeStake: Number(h.active_stake || "0") / 1e6,
    delegatorsCount: h.delegators_count,
  }));
}

// /governance/dreps/{drep_id} → DRep metadata (givenName)
async function bfDRepMeta(drepId, bfKey) {
  if (!drepId) return null;
  if (drepId === "drep_always_abstain" || drepId === "drep_always_no_confidence") return null;
  try {
    // Try CIP-119 metadata via /governance/dreps/{drep_id}/metadata
    const meta = await bfGet(`/governance/dreps/${drepId}/metadata`, bfKey);
    if (meta && (meta.json_metadata?.givenName || meta.json_metadata?.body?.givenName)) {
      return meta.json_metadata?.givenName || meta.json_metadata?.body?.givenName;
    }
    // Fallback: check drep info for has_script etc
    const info = await bfGet(`/governance/dreps/${drepId}`, bfKey);
    if (info && info.amount) return null; // no name available
    return null;
  } catch (_) { return null; }
}

// /accounts/{stake_address}/rewards → reward history by epoch
async function bfRewards(stakeAddr, bfKey, count = 30) {
  const data = await bfGet(`/accounts/${stakeAddr}/rewards?count=${count}&order=desc`, bfKey);
  return (data || []).map(r => ({
    epoch: r.epoch,
    ada: +r.amount / 1e6,
    pool: r.pool_id,
    type: r.type,
  }));
}

// Known CNT tokens (policy_id + asset_name hex)
const KNOWN_CNT = {
  // NIGHT (Cardania)
  "f3dacc7af3a1e3e1795b7c10ccc69e1e28aef5cc41b15a2cf3e2ef91": { hex: "4e49474854", name: "NIGHT" },
  // SNEK
  "279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f": { hex: "534e454b", name: "SNEK" },
  // MIN (Minswap)
  "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6": { hex: "4d494e", name: "MIN" },
};

// Fetch full wallet data for one stake address
async function fetchWalletFromBF(stakeAddr, bfKey, name) {
  const acct = await bfAccount(stakeAddr, bfKey);
  if (!acct) throw new Error(`アカウント ${stakeAddr.slice(0,20)}... が見つかりません`);

  // Balance in ADA
  const balAda = Number(acct.totalLovelace) / 1e6;
  // Unclaimed rewards
  const rewAda = Number(acct.rewardsSum - acct.withdrawalsSum) / 1e6;

  // Pool ticker
  let poolTicker = "—";
  let poolName = "";
  if (acct.poolId) {
    try {
      const pm = await bfPoolMeta(acct.poolId, bfKey);
      poolTicker = pm.ticker;
      poolName = pm.name;
    } catch (_) { poolTicker = acct.poolId.slice(0, 8); }
  }

  // DRep — resolve name from on-chain metadata
  let drepLabel = "—";
  if (acct.drepId) {
    if (acct.drepId === "drep_always_abstain") drepLabel = "棄権(Abstain)";
    else if (acct.drepId === "drep_always_no_confidence") drepLabel = "不信任(No Confidence)";
    else {
      const drepName = await bfDRepMeta(acct.drepId, bfKey);
      drepLabel = drepName || acct.drepId.slice(0, 20) + "...";
    }
  }

  // Native tokens
  const assets = await bfAssets(stakeAddr, bfKey);
  const tokens = {};
  const allAssets = []; // store all native assets for display
  for (const a of assets) {
    const policyId = a.unit.slice(0, 56);
    const assetHex = a.unit.slice(56);
    const known = KNOWN_CNT[policyId];
    const name = known ? known.name : (() => {
      try {
        // Try to decode hex asset name to ASCII
        const decoded = assetHex.match(/.{1,2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join('') || '';
        // Check if decoded string is printable ASCII
        return /^[\x20-\x7E]+$/.test(decoded) ? decoded : `${policyId.slice(0,8)}...${assetHex.slice(0,8)}`;
      } catch { return `${policyId.slice(0,8)}...`; }
    })();
    tokens[name] = (tokens[name] || 0) + (+a.quantity);
    allAssets.push({ policyId, assetHex, name, quantity: +a.quantity });
  }

  // Reward history
  let rewards = [];
  try { rewards = await bfRewards(stakeAddr, bfKey); } catch (_) {}

  // Addresses
  let addrs = [];
  try { addrs = await bfAddresses(stakeAddr, bfKey); } catch (_) {}

  // Pool detailed info for alerts
  let poolInfo = null;
  let poolHistory = [];
  if (acct.poolId) {
    try { poolInfo = await bfPoolInfo(acct.poolId, bfKey); } catch (_) {}
    try { poolHistory = await bfPoolHistory(acct.poolId, bfKey, 10); } catch (_) {}
  }

  return {
    id: stakeAddr,
    name: name || stakeAddr.slice(0, 12) + "...",
    stake: stakeAddr,
    addr: addrs[0] || "—",
    bal: balAda,
    pool: poolTicker,
    poolId: acct.poolId || "",
    poolName,
    poolInfo,
    poolHistory,
    drep: drepLabel,
    drepId: acct.drepId || "",
    rew: rewAda,
    cat: 0, // Catalyst rewards not in Blockfrost, manual entry
    tokens,
    allAssets,
    rewards,
    active: acct.active,
  };
}

// ── Mock fallback data ──
// Real prices as of 2026-03-02 (USD/JPY=156.3)
const MOCK_P = { ADA: { usd: 0.277, jpy: 43.3, btc: 0.00000418, mcap: 9700000000 }, BTC: { usd: 66200, jpy: 10346460, btc: 1, mcap: 1310760000000 }, ETH: { usd: 1994, jpy: 311660, btc: 0.03012, mcap: 239280000000 }, SOL: { usd: 84.4, jpy: 13191, btc: 0.001275, mcap: 36292000000 }, XRP: { usd: 1.35, jpy: 211, btc: 0.0000204, mcap: 74250000000 }, GOLD: { usd: 5380, jpy: 840894, btc: 0.08126, mcap: 28514000000 }, NIGHT: { usd: 0.0012, jpy: 0.19, btc: 0.0000000181 }, SNEK: { usd: 0.0045, jpy: 0.70, btc: 0.0000000680 }, MIN: { usd: 0.035, jpy: 5.47, btc: 0.000000529 } };
// Real approximate change percentages as of 2026-03-02
const MOCK_PC = {
  ADA: { "24h": -6.0, "7d": -18.5, "1m": -32.1, "3m": -45.2, "6m": -62.0, "1y": -58.3 },
  BTC: { "24h": -2.7, "7d": -8.4, "1m": -18.2, "3m": -32.5, "6m": -28.1, "1y": -30.5 },
  ETH: { "24h": 7.5, "7d": -12.6, "1m": -25.8, "3m": -42.1, "6m": -52.3, "1y": -48.7 },
  SOL: { "24h": 10.8, "7d": -15.2, "1m": -28.4, "3m": -48.6, "6m": -55.1, "1y": -42.8 },
  XRP: { "24h": -3.2, "7d": -14.8, "1m": -22.5, "3m": -38.7, "6m": -12.4, "1y": 115.0 },
  GOLD: { "24h": 0.8, "7d": 2.1, "1m": 5.4, "3m": 12.8, "6m": 18.5, "1y": 42.3 },
  NIGHT: { "24h": null, "7d": null, "1m": null, "3m": null, "6m": null, "1y": null },
  SNEK: { "24h": null, "7d": null, "1m": null, "3m": null, "6m": null, "1y": null },
  MIN: { "24h": null, "7d": null, "1m": null, "3m": null, "6m": null, "1y": null },
};
// Real approximate high/low as of 2026-03-02
const MOCK_HL = {
  ADA: { "24h": { hi: 0.295, lo: 0.268 }, "7d": { hi: 0.34, lo: 0.265 }, "1m": { hi: 0.41, lo: 0.265 }, all: { hi: 3.10, lo: 0.017 } },
  BTC: { "24h": { hi: 68100, lo: 65200 }, "7d": { hi: 72300, lo: 64800 }, "1m": { hi: 81000, lo: 64800 }, all: { hi: 108786, lo: 3200 } },
  ETH: { "24h": { hi: 2010, lo: 1850 }, "7d": { hi: 2280, lo: 1820 }, "1m": { hi: 2690, lo: 1820 }, all: { hi: 4878, lo: 0.43 } },
  SOL: { "24h": { hi: 86.5, lo: 76.2 }, "7d": { hi: 99.8, lo: 75.0 }, "1m": { hi: 118, lo: 75.0 }, all: { hi: 294, lo: 0.50 } },
  XRP: { "24h": { hi: 1.40, lo: 1.30 }, "7d": { hi: 1.58, lo: 1.28 }, "1m": { hi: 1.74, lo: 1.28 }, all: { hi: 3.84, lo: 0.003 } },
  GOLD: { "24h": { hi: 5405, lo: 5340 }, "7d": { hi: 5420, lo: 5250 }, "1m": { hi: 5420, lo: 5100 }, all: { hi: 5420, lo: 1520 } },
  NIGHT: { "24h": { hi: 0.0014, lo: 0.0011 }, "7d": { hi: 0.0016, lo: 0.0009 }, "1m": { hi: 0.0022, lo: 0.0006 }, all: { hi: 0.005, lo: 0.0001 } },
  SNEK: { "24h": { hi: 0.0048, lo: 0.0042 }, "7d": { hi: 0.0055, lo: 0.0038 }, "1m": { hi: 0.0065, lo: 0.0032 }, all: { hi: 0.012, lo: 0.0005 } },
  MIN: { "24h": { hi: 0.037, lo: 0.033 }, "7d": { hi: 0.042, lo: 0.029 }, "1m": { hi: 0.048, lo: 0.024 }, all: { hi: 0.085, lo: 0.003 } },
};
// Realistic COMBINED_HIST: simulates 90-day decline trend ending at current real prices (2026-03-02)
const MOCK_COMBINED_HIST = (() => {
  // Seed-based pseudo-random for reproducible data
  let seed = 42;
  const srand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const noise = () => (srand() - 0.48) * 2;
  // End prices (real as of 2026-03-02), start prices (approx 90 days ago / early Dec 2025)
  const end = { ada: 0.277, btc: 66200, eth: 1994, sol: 84.4, xrp: 1.35, gold: 5380, acwi: 95 };
  const start = { ada: 0.52, btc: 97000, eth: 3400, sol: 165, xrp: 2.20, gold: 4600, acwi: 108 };
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (90 - i));
    const t = i / 89; // 0→1 over 90 days
    const lerp = (s, e) => s + (e - s) * t;
    const n = (base, vol) => +(base + noise() * vol * base).toFixed(base < 1 ? 6 : base < 100 ? 2 : 0);
    // Prices with downtrend + noise
    const pADA = n(lerp(start.ada, end.ada), 0.03);
    const btcPrice = n(lerp(start.btc, end.btc), 0.02);
    const ethPrice = n(lerp(start.eth, end.eth), 0.03);
    const solPrice = n(lerp(start.sol, end.sol), 0.04);
    const xrpPrice = n(lerp(start.xrp, end.xrp), 0.03);
    const goldPrice = n(lerp(start.gold, end.gold), 0.01);
    const acwiPrice = n(lerp(start.acwi, end.acwi), 0.015);
    // Mock balances (DBSync待ち - slight accumulation trend)
    const rawADA = +(125000 + srand() * 3000 + i * 50).toFixed(0);
    const rawNIGHT = +(2400000 + srand() * 100000).toFixed(0);
    const rawSNEK = +(140000 + srand() * 10000).toFixed(0);
    const rawMIN = +(80000 + srand() * 5000).toFixed(0);
    const pNIGHT = +(0.001 + (srand()-0.5) * 0.0004).toFixed(6);
    const pSNEK = +(0.004 + (srand()-0.5) * 0.001).toFixed(6);
    const pMIN = +(0.03 + (srand()-0.5) * 0.008).toFixed(6);
    const uADA = rawADA * pADA, uNIGHT = rawNIGHT * pNIGHT, uSNEK = rawSNEK * pSNEK, uMIN = rawMIN * pMIN;
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`, rawADA, rawNIGHT, rawSNEK, rawMIN, pADA, pNIGHT, pSNEK, pMIN,
      uADA, uNIGHT, uSNEK, uMIN, uTOTAL: uADA + uNIGHT + uSNEK + uMIN,
      btcPrice, ethPrice, solPrice, xrpPrice, goldPrice, acwiPrice,
      mcADA: pADA * 35e9, mcBTC: btcPrice * 19.8e6, mcETH: ethPrice * 120e6,
      mcSOL: solPrice * 430e6, mcXRP: xrpPrice * 55e9, mcGold: goldPrice * 5.3e6, mcACWI: acwiPrice * 1,
    };
  });
})();

const CHANGE_PERIODS = [
  { key: "24h", label: "24h" }, { key: "7d", label: "7日" }, { key: "1m", label: "1ヶ月" },
  { key: "3m", label: "3ヶ月" }, { key: "6m", label: "6ヶ月" }, { key: "1y", label: "1年" },
];

const WALLETS_INIT = [];
const MANUAL_INIT = [];
const MULTI = [];
const REW = [];

// ── Collapsible Section ──
const Section = ({ title, icon, children, defaultOpen = true, rightEl }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800 transition-colors text-left">
        {icon}
        <span className="font-bold text-sm text-gray-200 flex-1">{title}</span>
        {rightEl && <span className="mr-2">{rightEl}</span>}
        {open ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

// ── Toggle button helper ──
const Btn = ({active, onClick, children, color}) => (
  <button onClick={onClick}
    className={`rounded text-xs font-medium border transition-colors px-1.5 py-0.5 ${active ? "text-white" : "text-gray-500 border-gray-700 hover:text-gray-300"}`}
    style={active ? {backgroundColor:(color||'#3B82F6')+'33', color: color||'#fff', borderColor:(color||'#3B82F6')+'66'} : {}}>
    {children}
  </button>
);

// ══════════════════════════════
// localStorage helpers
// ══════════════════════════════
const LS_KEY = "cardanowatch";
function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveLS(patch) {
  try {
    const cur = loadLS();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch {}
}

// ══════════════════════════════
// Main Dashboard
// ══════════════════════════════
export default function ADADashboard() {
  // Load persisted data once
  const [saved] = useState(() => loadLS());

  const [hide, setHide] = useState(false);
  const [wallets, setWallets] = useState(saved.wallets || WALLETS_INIT);
  const [manual, setManual] = useState(saved.manual || MANUAL_INIT);
  const [mName, setMName] = useState(""); const [mAmt, setMAmt] = useState("");
  const [newAddr, setNewAddr] = useState(""); const [newName, setNewName] = useState("");
  const [email, setEmail] = useState(saved.email || "");
  const [alerts, setAlerts] = useState(saved.alerts || { pool: true, drep: true, pledge: true, margin: true, blocks: true });
  const [emailSaved, setEmailSaved] = useState(false);
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [alertStatus, setAlertStatus] = useState(""); // "", "granted", "denied"

  // ── Live data state ──
  const [liveP, setLiveP] = useState(null);
  const [livePC, setLivePC] = useState(null);
  const [liveHL, setLiveHL] = useState(null);
  const [liveHist, setLiveHist] = useState(null);
  const [apiStatus, setApiStatus] = useState("idle"); // idle | loading | ok | error
  const [apiError, setApiError] = useState("");
  const [lastFetch, setLastFetch] = useState(null);
  const [jpyRate, setJpyRate] = useState(saved.jpyRate || 156.3);
  const [avKey, setAvKey] = useState(saved.avKey || "");
  const [cgKey, setCgKey] = useState(saved.cgKey || process.env.NEXT_PUBLIC_CG_KEY || "");
  const [bfKey, setBfKey] = useState(saved.bfKey || "mainnetFA7zBLvTK3khhdskvU5a7207mOuaYJcA");

  // ── Persist to localStorage on change ──
  useEffect(() => { saveLS({ wallets }); }, [wallets]);
  useEffect(() => { saveLS({ manual }); }, [manual]);
  useEffect(() => { saveLS({ email }); }, [email]);
  useEffect(() => { saveLS({ alerts }); }, [alerts]);
  useEffect(() => { saveLS({ jpyRate }); }, [jpyRate]);
  useEffect(() => { saveLS({ avKey }); }, [avKey]);
  useEffect(() => { saveLS({ cgKey }); }, [cgKey]);
  useEffect(() => { saveLS({ bfKey }); }, [bfKey]);
  const [bfStatus, setBfStatus] = useState("idle"); // idle | loading | ok | error
  const [bfError, setBfError] = useState("");
  const [walletRewards, setWalletRewards] = useState([]); // combined reward history from Blockfrost
  const [epochRates, setEpochRates] = useState({}); // { epoch: { usd, jpy, date } } from epoch-rates.json

  // CSV export options with localStorage persistence
  const [csvCurrency, setCsvCurrency] = useState(saved.csvCurrency || "jpy"); // "jpy" | "usd"
  const [csvTimezone, setCsvTimezone] = useState(saved.csvTimezone || "JST"); // "JST" | "UTC"
  const [csvRewardSplit, setCsvRewardSplit] = useState(saved.csvRewardSplit ?? false); // false=合算, true=分離

  useEffect(() => { saveLS({ csvCurrency }); }, [csvCurrency]);
  useEffect(() => { saveLS({ csvTimezone }); }, [csvTimezone]);
  useEffect(() => { saveLS({ csvRewardSplit }); }, [csvRewardSplit]);

  // Load epoch-rates.json (pre-fetched by scripts/fetch-epoch-rates.mjs)
  useEffect(() => {
    fetch("/epoch-rates.json")
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.rates) {
          setEpochRates(data.rates);
          console.log(`[EpochRates] ${Object.keys(data.rates).length}エポック読み込み (${data.meta?.lastUpdated || "?"})`);
        }
      })
      .catch(() => console.log("[EpochRates] epoch-rates.json 未生成 — node scripts/fetch-epoch-rates.mjs で生成してください"));
  }, []);

  // Data source tracking
  const [dataSource, setDataSource] = useState({ prices: "mock", history: "mock", details: "" });

  // Computed: use live data or fall back to mock
  const P = liveP || MOCK_P;
  const PC = livePC || MOCK_PC;
  const PRICE_HL = liveHL || MOCK_HL;
  const COMBINED_HIST = liveHist || null; // DON'T fall back to mock - show nothing
  const isLive = !!liveP;
  const isHistLive = !!liveHist;

  // ── Fetch live data ──
  const fetchAllData = useCallback(async () => {
    setApiStatus("loading");
    setApiError("");
    try {
      // 0. Auto-fetch USD/JPY rate from CoinGecko
      let effectiveJpyRate = jpyRate;
      try {
        const autoJpy = await fetchJpyRate(cgKey);
        if (autoJpy && autoJpy > 100 && autoJpy < 300) { // sanity check
          effectiveJpyRate = Math.round(autoJpy * 10) / 10;
          setJpyRate(effectiveJpyRate);
          console.log(`✓ USD/JPY auto-fetched: ${effectiveJpyRate}`);
        }
      } catch (e) { console.warn("JPY rate auto-fetch failed, using manual:", jpyRate); }

      // 1. Fetch current prices
      const { P: newP, PC: newPC, HL: newHL } = await fetchMarkets(effectiveJpyRate, cgKey);
      // Merge CNT token mock prices (NIGHT/SNEK/MIN not on CoinGecko)
      for (const k of ["NIGHT", "SNEK", "MIN"]) {
        newP[k] = { ...MOCK_P[k], _mock: true };
        newPC[k] = { ...MOCK_PC[k], _mock: true };
        newHL[k] = { ...MOCK_HL[k], _mock: true };
      }
      setLiveP(newP);
      setLivePC(newPC);
      setLiveHL(newHL);

      setDataSource(prev => ({ ...prev, prices: "live" }));

      // 2. Fetch 90-day history for each CoinGecko asset
      const histMap = {};
      const histErrors = [];
      for (const [key, id] of Object.entries(CG_IDS)) {
        try {
          const h = await fetchHistory(id, cgKey);
          if (h && h.length > 0) {
            histMap[key] = h;
            console.log(`✓ ${key} history: ${h.length} days`);
          } else {
            histErrors.push(`${key}: empty`);
          }
          await new Promise(r => setTimeout(r, 2000)); // 2s delay for rate limit
        } catch (e) {
          histErrors.push(`${key}: ${e.message}`);
          console.warn(`✗ ${key} history failed:`, e.message);
          // If rate limited (429), wait longer before next request
          if (e.message?.includes("429")) {
            await new Promise(r => setTimeout(r, 10000));
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      // 3. Optionally fetch ACWI
      let acwiHist = null;
      if (avKey) {
        try { acwiHist = await fetchACWI(avKey); } catch (e) { console.warn("ACWI fetch failed:", e); }
      }

      // 4. Build combined history with real wallet balances if available
      const histCount = Object.keys(histMap).length;
      if (histCount > 0) {
        // Collect real balances from wallets
        const realTotalAda = wallets.reduce((s, w) => s + (w.bal || 0), 0);
        const realTokens = {};
        for (const w of wallets) {
          if (w.tokens) {
            for (const [name, qty] of Object.entries(w.tokens)) {
              realTokens[name] = (realTokens[name] || 0) + qty;
            }
          }
        }
        const realBalances = realTotalAda > 0 ? { totalAda: realTotalAda, tokens: realTokens } : null;
        const combined = buildCombinedHist(histMap, acwiHist, realBalances);
        if (combined) {
          setLiveHist(combined);
          setDataSource(prev => ({ ...prev, history: "live", details: `${histCount}/${Object.keys(CG_IDS).length}通貨の履歴取得成功` }));
        }
      } else {
        setDataSource(prev => ({ ...prev, history: "mock", details: `履歴取得失敗: ${histErrors.join(", ")}` }));
      }

      // 5. Compute 7d/1m high/low from history + calculate 3m change from 90-day data
      if (histMap.ADA) {
        for (const [key, arr] of Object.entries(histMap)) {
          if (!newHL[key]) continue;
          const last7 = arr.slice(-7), last30 = arr.slice(-30);
          if (last7.length > 0) newHL[key]["7d"] = { hi: Math.max(...last7.map(x=>x.price)), lo: Math.min(...last7.map(x=>x.price)) };
          if (last30.length > 0) newHL[key]["1m"] = { hi: Math.max(...last30.map(x=>x.price)), lo: Math.min(...last30.map(x=>x.price)) };
          // Calculate ~3m change from 90-day history
          if (arr.length >= 2 && newPC[key]) {
            const oldest = arr[0]?.price;
            const newest = arr[arr.length - 1]?.price;
            if (oldest && newest && oldest > 0) {
              newPC[key]["3m"] = +(((newest - oldest) / oldest) * 100).toFixed(1);
            }
          }
        }
        setLiveHL({...newHL});
        setLivePC({...newPC});
      }

      setApiStatus("ok");
      setLastFetch(new Date());
    } catch (e) {
      console.error("API fetch failed:", e);
      setApiStatus("error");
      setApiError(e.message || "API取得失敗");
    }
  }, [jpyRate, avKey, cgKey, wallets]);

  // Auto-fetch prices on mount
  useEffect(() => { fetchAllData(); }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setAlertStatus(Notification.permission);
    }
  }, []);

  // Auto-refresh wallets from Blockfrost on mount
  useEffect(() => {
    if (bfKey && wallets.length > 0 && wallets.some(w => w.stake?.startsWith("stake1"))) {
      refreshWallets();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Balance chart
  const [chartUnit, setChartUnit] = useState("usd");
  const [chartAssets, setChartAssets] = useState({ ADA: true, NIGHT: false, SNEK: false, MIN: false, TOTAL: true });
  const [balPeriod, setBalPeriod] = useState("all");

  // Price analysis chart (separate panel)
  const [showPriceOverlay, setShowPriceOverlay] = useState({adaPrice: true, btcPrice: false, ethPrice: false, solPrice: false, xrpPrice: false, goldPrice: false, acwiPrice: false});
  const [priceMode, setPriceMode] = useState("indexed");
  const [pricePeriod, setPricePeriod] = useState("all");
  const [baseIdx, setBaseIdx] = useState(0);

  // Table toggles
  const [visiblePeriods, setVisiblePeriods] = useState({"24h": true, "7d": false, "1m": false, "3m": false, "6m": false, "1y": false});
  const [visibleCols, setVisibleCols] = useState({ amt: true, usd: true, btc: false, jpy: true, tier: false, nextTier: false, rank: false, pct: false, hl: false });
  const [hlPeriod, setHlPeriod] = useState("24h");
  const [showZeroUsd, setShowZeroUsd] = useState(false); // hide $0 assets by default

  const totalAda = useMemo(() => wallets.reduce((s, w) => s + w.bal, 0) + manual.reduce((s, e) => s + e.amount, 0), [wallets, manual]);
  const tier = getTier(totalAda);
  const next = getNextTier(totalAda);
  const totalRew = wallets.reduce((s, w) => s + w.rew, 0);
  const totalCat = wallets.reduce((s, w) => s + w.cat, 0);
  const H = (v) => hide ? "•••••" : v;
  const usd = totalAda * P.ADA.usd, jpy = totalAda * P.ADA.jpy, btc = totalAda * P.ADA.btc;
  const rank = null, holders = null, pct = null; // Rank data requires DBSync or external API

  const filterByPeriod = (data, period) => {
    if (period === "all") return data;
    const days = { "24h": 1, "7d": 7, "1m": 30 }[period] || 90;
    return data.slice(-days);
  };

  // Balance chart data
  const balChartData = useMemo(() => {
    const unitConvert = (usdVal, row) => {
      if (chartUnit === "usd") return usdVal;
      if (chartUnit === "jpy") return usdVal * jpyRate;
      if (chartUnit === "ada") return row.pADA > 0 ? usdVal / row.pADA : 0;
      if (chartUnit === "btc") return row.btcPrice > 0 ? usdVal / row.btcPrice : 0;
      return usdVal;
    };
    if (!COMBINED_HIST) return [];
    return filterByPeriod(COMBINED_HIST, balPeriod).map(row => ({
      date: row.date,
      ADA: unitConvert(row.uADA, row),
      NIGHT: unitConvert(row.uNIGHT, row),
      SNEK: unitConvert(row.uSNEK, row),
      MIN: unitConvert(row.uMIN, row),
      TOTAL: unitConvert(row.uTOTAL, row),
    }));
  }, [chartUnit, balPeriod, COMBINED_HIST]);

  // Filtered data for price chart (shared between data + slider)
  const priceFiltered = useMemo(() => COMBINED_HIST ? filterByPeriod(COMBINED_HIST, pricePeriod) : [], [pricePeriod, COMBINED_HIST]);

  // Clamp baseIdx when period changes
  const safeBaseIdx = Math.max(0, Math.min(baseIdx, priceFiltered.length - 1));

  // Price chart data
  const priceChartData = useMemo(() => {
    if (priceFiltered.length === 0) return [];
    const priceKeys = { adaPrice: "pADA", btcPrice: "btcPrice", ethPrice: "ethPrice", solPrice: "solPrice", xrpPrice: "xrpPrice", goldPrice: "goldPrice", acwiPrice: "acwiPrice" };
    const mcapKeys = { adaPrice: "mcADA", btcPrice: "mcBTC", ethPrice: "mcETH", solPrice: "mcSOL", xrpPrice: "mcXRP", goldPrice: "mcGold", acwiPrice: "mcACWI" };
    const base = priceFiltered[safeBaseIdx] || priceFiltered[0];
    if (!base) return [];
    const basePrice = {};
    Object.entries(priceKeys).forEach(([k, rawK]) => { basePrice[k] = +base[rawK] || 1; });
    return priceFiltered.map((row, idx) => {
      const entry = { date: row.date, _idx: idx };
      Object.entries(priceKeys).forEach(([key, rawK]) => {
        if (priceMode === "price") entry[key] = +row[rawK];
        else if (priceMode === "mcap") entry[key] = +row[mcapKeys[key]] / 1e9;
        else entry[key] = (+row[rawK] / basePrice[key]) * 100;
      });
      return entry;
    });
  }, [priceMode, pricePeriod, safeBaseIdx, priceFiltered]);

  const addManual = () => { if (mName && mAmt) { setManual([...manual, { id: Date.now(), name: mName, amount: +mAmt || 0 }]); setMName(""); setMAmt(""); }};

  // ── Blockfrost: Add wallet by stake address ──
  const addWallet = useCallback(async () => {
    const addr = newAddr.trim();
    if (!addr) return;
    if (!bfKey) { setBfError("Blockfrost APIキーを設定してください（高度な設定 → Blockfrost）"); setBfStatus("error"); return; }
    // Support addr1... by resolving to stake address, or direct stake1...
    let stakeAddr = addr;
    if (addr.startsWith("addr")) {
      setBfStatus("loading");
      try {
        const addrInfo = await bfGet(`/addresses/${addr}`, bfKey);
        if (!addrInfo || !addrInfo.stake_address) throw new Error("stakeアドレスが取得できません");
        stakeAddr = addrInfo.stake_address;
      } catch (e) { setBfStatus("error"); setBfError(e.message); return; }
    }
    // Check duplicate
    if (wallets.find(w => w.stake === stakeAddr)) { setBfError("このウォレットは既に登録済みです"); setBfStatus("error"); return; }
    setBfStatus("loading"); setBfError("");
    try {
      const wData = await fetchWalletFromBF(stakeAddr, bfKey, newName || undefined);
      setWallets(prev => [...prev, wData]);
      // Collect rewards
      if (wData.rewards.length > 0) {
        setWalletRewards(prev => [...prev, ...wData.rewards.map(r => ({ ...r, wallet: wData.name }))]);
      }
      setNewAddr(""); setNewName("");
      setBfStatus("ok");
    } catch (e) { setBfStatus("error"); setBfError(e.message); }
  }, [newAddr, newName, bfKey, wallets]);

  // ── Blockfrost: Refresh all wallets ──
  const refreshWallets = useCallback(async () => {
    if (!bfKey || wallets.length === 0) return;
    // Only refresh wallets that have real stake addresses (not mock)
    const realWallets = wallets.filter(w => w.stake && w.stake.startsWith("stake1") && !w.stake.includes("..."));
    if (realWallets.length === 0) return;
    setBfStatus("loading"); setBfError("");
    try {
      const updated = [...wallets];
      const allRewards = [];
      for (const w of realWallets) {
        const fresh = await fetchWalletFromBF(w.stake, bfKey, w.name);
        const idx = updated.findIndex(x => x.stake === w.stake);
        if (idx >= 0) updated[idx] = fresh;
        if (fresh.rewards.length > 0) allRewards.push(...fresh.rewards.map(r => ({ ...r, wallet: fresh.name })));
        await new Promise(r => setTimeout(r, 300)); // rate limit
      }
      setWallets(updated);
      if (allRewards.length > 0) setWalletRewards(allRewards);
      setBfStatus("ok");
    } catch (e) { setBfStatus("error"); setBfError(e.message); }
  }, [bfKey, wallets]);

  // Auto-check alerts when wallets update (with poolInfo data)
  useEffect(() => {
    if (wallets.some(w => w.poolInfo)) checkAlerts();
  }, [wallets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notification handler
  const requestNotification = async () => {
    if (!('Notification' in window)) { setAlertStatus("denied"); return; }
    const perm = await Notification.requestPermission();
    setAlertStatus(perm);
  };

  // Alert check: run on wallet refresh - check pool retirement and DRep activity
  // Pool alert messages (also displayed in UI)
  const [poolAlerts, setPoolAlerts] = useState([]);

  const checkAlerts = useCallback(() => {
    const newAlerts = [];
    for (const w of wallets) {
      if (alerts.pool && (!w.pool || w.pool === "—")) {
        newAlerts.push({ type: "pool", severity: "warn", wallet: w.name, msg: `${w.name}: ステークプールが未委任または停止` });
      }
      if (alerts.drep && (!w.drep || w.drep === "—")) {
        newAlerts.push({ type: "drep", severity: "info", wallet: w.name, msg: `${w.name}: DRep委任が未設定` });
      }
      // Pool pledge check
      if (alerts.pledge && w.poolInfo) {
        const pi = w.poolInfo;
        if (pi.livePledge < pi.declaredPledge) {
          const diff = ((1 - pi.livePledge / pi.declaredPledge) * 100).toFixed(1);
          newAlerts.push({ type: "pledge", severity: "warn", wallet: w.name,
            msg: `${w.name} → ${w.pool}: プレッジ不足 (実際 ${Math.round(pi.livePledge).toLocaleString()} / 宣言 ${Math.round(pi.declaredPledge).toLocaleString()} ADA, ${diff}%不足)` });
        }
        // Pool retiring
        if (pi.retiring) {
          newAlerts.push({ type: "pool", severity: "warn", wallet: w.name,
            msg: `${w.name} → ${w.pool}: プール引退予定 (エポック ${pi.retiring})` });
        }
      }
      // Margin/fixed cost change detection (compare with previous known values)
      if (alerts.margin && w.poolInfo) {
        const pi = w.poolInfo;
        const prevKey = `poolMargin_${w.poolId}`;
        const prev = localStorage.getItem(prevKey);
        const current = `${pi.marginCost}|${pi.fixedCost}`;
        if (prev && prev !== current) {
          const [oldM, oldF] = prev.split("|").map(Number);
          const msgs = [];
          if (oldM !== pi.marginCost) msgs.push(`マージン ${(oldM*100).toFixed(2)}% → ${(pi.marginCost*100).toFixed(2)}%`);
          if (oldF !== pi.fixedCost) msgs.push(`固定費 ${oldF} → ${pi.fixedCost} ADA`);
          if (msgs.length > 0) {
            newAlerts.push({ type: "margin", severity: "warn", wallet: w.name,
              msg: `${w.name} → ${w.pool}: 手数料変更検出 — ${msgs.join(", ")}` });
          }
        }
        localStorage.setItem(prevKey, current);
      }
      // Block production anomaly check
      if (alerts.blocks && w.poolHistory && w.poolHistory.length >= 3 && w.poolInfo) {
        const ph = w.poolHistory; // newest first
        const pi = w.poolInfo;
        // Expected blocks ≈ (liveStake / totalStake) * 21600 per epoch (roughly)
        // Simpler: check if recent epochs have 0 blocks despite significant stake
        const recentZero = ph.slice(0, 5).filter(h => h.blocks === 0).length;
        const hasSignificantStake = pi.liveStake > 100000; // >100k ADA delegated
        if (recentZero >= 3 && hasSignificantStake) {
          newAlerts.push({ type: "blocks", severity: "warn", wallet: w.name,
            msg: `${w.name} → ${w.pool}: 直近5エポック中${recentZero}回ブロック生成なし (委任量 ${Math.round(pi.liveStake/1000)}K ADA) — プール運営に問題の可能性` });
        }
        // Low performance: blocks much lower than expected
        const avgBlocks = ph.slice(0, 5).reduce((s, h) => s + h.blocks, 0) / Math.min(ph.length, 5);
        // Rough expected: (liveStake / 22.6B) * 21600 ≈ expected blocks per epoch
        const expectedPerEpoch = (pi.liveStake / 22_600_000_000) * 21600;
        if (expectedPerEpoch > 1 && avgBlocks < expectedPerEpoch * 0.3 && ph.length >= 3) {
          newAlerts.push({ type: "blocks", severity: "info", wallet: w.name,
            msg: `${w.name} → ${w.pool}: ブロック生成低調 (平均 ${avgBlocks.toFixed(1)} / 期待値 ${expectedPerEpoch.toFixed(1)} ブロック/エポック)` });
        }
      }
    }
    setPoolAlerts(newAlerts);
    // Send browser notifications
    if (alertStatus === "granted" && newAlerts.length > 0) {
      for (const a of newAlerts.filter(x => x.severity === "warn")) {
        new Notification(`ADATOOL: ${a.type === "pledge" ? "プレッジ警告" : a.type === "margin" ? "手数料変更" : a.type === "blocks" ? "ブロック生成警告" : a.type === "drep" ? "DRep警告" : "プール警告"}`, { body: a.msg, icon: "₳" });
      }
    }
  }, [wallets, alerts, alertStatus]);

  // Remove wallet
  const removeWallet = (id) => {
    setWallets(prev => prev.filter(w => w.id !== id));
  };

  // Combined reward data for chart (Blockfrost rewards or fallback to mock REW)
  const rewardData = useMemo(() => {
    if (walletRewards.length > 0) {
      // Group by epoch, sum ADA
      const byEpoch = {};
      for (const r of walletRewards) {
        if (!byEpoch[r.epoch]) byEpoch[r.epoch] = { epoch: r.epoch, ada: 0 };
        byEpoch[r.epoch].ada += r.ada;
      }
      return Object.values(byEpoch).sort((a, b) => a.epoch - b.epoch).slice(-30).map(r => ({
        ...r, usd: +(r.ada * P.ADA.usd).toFixed(2), jpy: +(r.ada * P.ADA.jpy).toFixed(0),
        date: `Epoch ${r.epoch}`,
      }));
    }
    return REW;
  }, [walletRewards, P]);

  // Native token summary from Blockfrost wallets
  const liveMulti = useMemo(() => {
    const totals = {};
    for (const w of wallets) {
      if (!w.tokens) continue;
      for (const [name, qty] of Object.entries(w.tokens)) {
        totals[name] = (totals[name] || 0) + qty;
      }
    }
    if (Object.keys(totals).length === 0) return null; // fallback to MULTI mock
    return Object.entries(totals).map(([name, amt]) => {
      const mockPrice = MOCK_P[name]?.usd || 0;
      return { name, amt, usd: mockPrice, rank: "—", pct: "—" };
    });
  }, [wallets]);

  const exportCSV = () => {
    const lines = [];
    const BOM = "\uFEFF"; // Excel UTF-8 BOM
    const cLabel = csvCurrency.toUpperCase(); // "JPY" or "USD"

    // Helper: Get rate for a specific epoch using the selected currency
    const getRate = (ep) => {
      const cached = epochRates[ep];
      if (cached) {
        const rate = csvCurrency === "jpy" ? cached.jpy : cached.usd;
        if (rate !== null && rate !== undefined) return { rate, src: "PoolTool" };
      }
      // Fallback to current rate
      const rate = csvCurrency === "jpy" ? P.ADA.jpy : P.ADA.usd;
      return { rate, src: "現在" };
    };

    // Helper: Format date with timezone
    const fmtDate = (isoStr) => {
      const d = new Date(isoStr);
      if (csvTimezone === "JST") {
        const jst = new Date(d.getTime() + 9 * 3600000);
        return jst.toISOString().replace("T", " ").slice(0, 19) + " JST";
      }
      return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
    };

    // Helper: Convert epoch number to date string with timezone
    const epochToDateStr = (ep) => {
      const SHELLEY_EPOCH = 208, SHELLEY_START_UTC = 1596059091, EPOCH_LENGTH = 432000;
      const ts = (SHELLEY_START_UTC + (ep - SHELLEY_EPOCH) * EPOCH_LENGTH) * 1000;
      const dateStr = epochRates[ep]?.date || new Date(ts).toISOString();
      return fmtDate(dateStr);
    };

    // Build allRewards from wallet.rewards + walletRewards state
    const allRewards = [];
    for (const w of wallets) {
      const rewards = w.rewards || [];
      for (const r of rewards) {
        allRewards.push({ ...r, wallet: w.name, stake: w.stake, poolLabel: w.pool || "—" });
      }
    }
    for (const r of walletRewards) {
      if (!allRewards.find(a => a.epoch === r.epoch && a.wallet === r.wallet)) {
        const wObj = wallets.find(w => w.name === r.wallet);
        allRewards.push({ ...r, stake: wObj?.stake || "", poolLabel: wObj?.pool || "—" });
      }
    }
    allRewards.sort((a, b) => a.epoch - b.epoch || (a.wallet || "").localeCompare(b.wallet || ""));

    // ── Build byEpoch data structure ──
    const wNames = wallets.map(w => w.name);
    const byEpoch = {};

    if (csvRewardSplit === false) {
      // Mode: Aggregated (合算)
      for (const r of allRewards) {
        if (!byEpoch[r.epoch]) {
          byEpoch[r.epoch] = { total: 0 };
          for (const n of wNames) byEpoch[r.epoch][n] = 0;
        }
        byEpoch[r.epoch].total += r.ada;
        if (byEpoch[r.epoch][r.wallet] !== undefined) byEpoch[r.epoch][r.wallet] += r.ada;
      }
    } else {
      // Mode: Split (分離) - track operator and stake separately
      for (const r of allRewards) {
        if (!byEpoch[r.epoch]) {
          byEpoch[r.epoch] = { total: 0 };
          for (const n of wNames) {
            byEpoch[r.epoch][`${n}_operator`] = 0;
            byEpoch[r.epoch][`${n}_stake`] = 0;
          }
        }
        const suffix = r.type === "leader" ? "_operator" : "_stake";
        byEpoch[r.epoch].total += r.ada;
        const key = `${r.wallet}${suffix}`;
        if (byEpoch[r.epoch][key] !== undefined) byEpoch[r.epoch][key] += r.ada;
      }
    }

    const epochs = Object.keys(byEpoch).sort((a, b) => +a - +b);

    // ── Epoch table ──
    // Build header
    let hdr = `Epoch,日時(${csvTimezone}),ADA/${cLabel}(エポック境界),合計(ADA),合計(${cLabel})`;
    if (csvRewardSplit === false) {
      for (const n of wNames) hdr += `,"${n}"(ADA),"${n}"(${cLabel})`;
    } else {
      for (const n of wNames) hdr += `,"${n}_運営"(ADA),"${n}_運営"(${cLabel}),"${n}_委任"(ADA),"${n}_委任"(${cLabel})`;
    }
    lines.push(hdr);

    // Build data rows
    const cumByW = {};
    if (csvRewardSplit === false) {
      for (const n of wNames) cumByW[n] = { ada: 0, converted: 0 };
    } else {
      for (const n of wNames) {
        cumByW[`${n}_operator`] = { ada: 0, converted: 0 };
        cumByW[`${n}_stake`] = { ada: 0, converted: 0 };
      }
    }
    let cumTotalAda = 0, cumTotalConverted = 0;

    for (const ep of epochs) {
      const e = byEpoch[ep];
      const dateStr = epochToDateStr(+ep);
      const { rate } = getRate(+ep);
      const totConverted = e.total * rate;
      cumTotalAda += e.total;
      cumTotalConverted += totConverted;

      let row = `${ep},${dateStr},${rate.toFixed(6)},${e.total.toFixed(6)},${totConverted.toFixed(2)}`;

      if (csvRewardSplit === false) {
        for (const n of wNames) {
          const ada = e[n] || 0;
          const wConverted = ada * rate;
          cumByW[n].ada += ada;
          cumByW[n].converted += wConverted;
          row += `,${ada.toFixed(6)},${wConverted.toFixed(2)}`;
        }
      } else {
        for (const n of wNames) {
          const opAda = e[`${n}_operator`] || 0;
          const stakeAda = e[`${n}_stake`] || 0;
          const opConverted = opAda * rate;
          const stakeConverted = stakeAda * rate;
          cumByW[`${n}_operator`].ada += opAda;
          cumByW[`${n}_operator`].converted += opConverted;
          cumByW[`${n}_stake`].ada += stakeAda;
          cumByW[`${n}_stake`].converted += stakeConverted;
          row += `,${opAda.toFixed(6)},${opConverted.toFixed(2)},${stakeAda.toFixed(6)},${stakeConverted.toFixed(2)}`;
        }
      }
      lines.push(row);
    }

    // Cumulative total row
    if (epochs.length > 0) {
      let totalRow = `累計合計,,,${cumTotalAda.toFixed(6)},${cumTotalConverted.toFixed(2)}`;
      if (csvRewardSplit === false) {
        for (const n of wNames) {
          totalRow += `,${cumByW[n].ada.toFixed(6)},${cumByW[n].converted.toFixed(2)}`;
        }
      } else {
        for (const n of wNames) {
          totalRow += `,${cumByW[`${n}_operator`].ada.toFixed(6)},${cumByW[`${n}_operator`].converted.toFixed(2)},${cumByW[`${n}_stake`].ada.toFixed(6)},${cumByW[`${n}_stake`].converted.toFixed(2)}`;
        }
      }
      lines.push(totalRow);
    }

    if (allRewards.length === 0) {
      lines.push(`# （報酬データなし — ウォレットを追加してBlockfrostから取得してください）`);
    }

    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `adatool-rewards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const PeriodBtns = ({value, onChange}) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-600 mr-1">期間:</span>
      {[{k:"24h",l:"24h"},{k:"7d",l:"7日"},{k:"1m",l:"1ヶ月"},{k:"all",l:"全期間"}].map(p => (
        <Btn key={p.k} active={value===p.k} onClick={()=>onChange(p.k)} color="#6366F1">{p.l}</Btn>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter','Noto Sans JP',system-ui,sans-serif" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs shrink-0">₳</div>
          <span className="text-sm sm:text-base font-bold">ADATOOL</span><span className="text-xs text-gray-500 hidden sm:inline ml-1">ダッシュボード</span>
          {isLive ? (
            <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-400 px-1 sm:px-1.5 py-0.5 rounded border border-green-800"><Wifi size={10}/> <span className="hidden sm:inline">Live</span></span>
          ) : (
            <span className="text-xs bg-yellow-900/40 text-yellow-500 px-1 sm:px-1.5 py-0.5 rounded border border-yellow-800/50"><span className="hidden sm:inline">Mock </span>3/2</span>
          )}
          {apiStatus === "loading" && <span className="flex items-center gap-1 text-xs text-yellow-400"><Loader size={10} className="animate-spin"/><span className="hidden sm:inline"> 取得中...</span></span>}
          {apiStatus === "error" && <span className="text-xs text-red-400 cursor-pointer hover:text-red-300" title={apiError} onClick={()=>setApiStatus("idle")}>Error ✕ <span className="text-red-500/70 hidden sm:inline">{apiError?.slice(0, 50)}</span></span>}
          <span className="hidden md:flex items-center gap-1 text-xs text-gray-600 ml-1">{lastFetch && <>更新: {lastFetch.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}</>}</span>
          <span className="hidden lg:flex items-center gap-1 text-xs text-green-600 ml-2">{bfKey && <><Wallet size={10}/> BF</>}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button onClick={() => setHide(!hide)} className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">{hide ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
          <button onClick={fetchAllData} disabled={apiStatus==="loading"} className={`p-1 sm:p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 ${apiStatus==="loading"?"animate-spin":""}`} title="価格データ更新"><RefreshCw size={14}/></button>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-800 text-gray-400" title="設定"><Settings size={14}/></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-1.5 sm:p-3 space-y-2 sm:space-y-3">

        {/* ═══ Data Source Banner ═══ */}
        {(dataSource.prices === "mock" || dataSource.history === "mock") && apiStatus !== "loading" && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-yellow-400 font-bold text-sm">⚠ モックデータ使用中</span>
            <span className="text-yellow-500/80 text-xs">
              {dataSource.prices === "mock" && dataSource.history === "mock"
                ? "価格・履歴データともにモック（静的データ）を表示しています。CoinGecko APIから取得できていません。"
                : dataSource.history === "mock"
                  ? "現在価格はLive取得済みですが、チャート履歴の取得に失敗しました。"
                  : "価格データが取得できていません。"}
            </span>
            {dataSource.details && <span className="text-yellow-600 text-xs">({dataSource.details})</span>}
            <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="ml-auto bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0">
              <RefreshCw size={10}/> 再取得
            </button>
            {!cgKey && (
              <span className="text-yellow-600 text-xs">💡 CoinGecko Demo APIキー（無料）を設定すると取得率が向上します → 高度な設定</span>
            )}
          </div>
        )}

        {/* ═══ Row 1: Asset Table ═══ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 overflow-x-auto">
            {/* Toggles */}
            <div className="flex items-center gap-1.5 sm:gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">変化期間:</span>
                {CHANGE_PERIODS.map(p => (
                  <Btn key={p.key} active={visiblePeriods[p.key]} onClick={() => setVisiblePeriods({...visiblePeriods, [p.key]: !visiblePeriods[p.key]})} color="#4B5563">{p.label}</Btn>
                ))}
              </div>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">表示列:</span>
                {[
                  {key:"amt",label:"保有量"},{key:"usd",label:"USD"},{key:"btc",label:"BTC"},
                  {key:"jpy",label:"JPY"},{key:"tier",label:"ティア"},{key:"nextTier",label:"次ティア"},
                  {key:"rank",label:"Rank"},{key:"pct",label:"%"},{key:"hl",label:"高安"},
                ].map(c => (
                  <Btn key={c.key} active={visibleCols[c.key]} onClick={() => setVisibleCols({...visibleCols, [c.key]: !visibleCols[c.key]})} color="#4B5563">{c.label}</Btn>
                ))}
              </div>
              {visibleCols.hl && (
                <>
                  <div className="w-px h-4 bg-gray-700"/>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600 mr-1">高安期間:</span>
                    {[{k:"24h",l:"24h"},{k:"7d",l:"7日"},{k:"1m",l:"1ヶ月"},{k:"all",l:"全期間"}].map(p => (
                      <Btn key={p.k} active={hlPeriod===p.k} onClick={()=>setHlPeriod(p.k)} color="#6366F1">{p.l}</Btn>
                    ))}
                  </div>
                </>
              )}
              <div className="w-px h-4 bg-gray-700"/>
              <Btn active={showZeroUsd} onClick={()=>setShowZeroUsd(!showZeroUsd)} color="#EF4444">$0も表示</Btn>
            </div>

            {/* Table */}
            {(() => {
              const activePeriods = CHANGE_PERIODS.filter(p => visiblePeriods[p.key]);
              const vc = visibleCols;
              const rows = [
                { name: "ADA", amt: totalAda, usdVal: usd, jpyVal: jpy, btcVal: btc, changes: PC.ADA, rank: rank ? `#${fmt(rank)}` : "—", total: holders ? fmt(holders) : "—", pct: pct ? `${pct}%` : "—", primary: true },
                ...(liveMulti || MULTI).map(a => {
                  const price = P[a.name] || { usd: a.usd, jpy: a.usd * jpyRate, btc: 0 };
                  const usdV = a.amt * (price.usd || a.usd);
                  return { name: a.name, amt: a.amt, usdVal: usdV, jpyVal: a.amt * (price.jpy || a.usd * jpyRate), btcVal: a.amt * (price.btc || 0), changes: PC[a.name] || {}, rank: (a.rank || "—").split(" / ")[0].trim(), total: (a.rank || "—").split(" / ")[1]?.trim() || "—", pct: a.pct || "—", primary: false };
                }),
              ];
              const filteredRows = showZeroUsd ? rows : rows.filter(r => r.primary || r.usdVal > 0.001);
              const hiddenCount = rows.length - filteredRows.length;
              const totUsd = rows.reduce((s, r) => s + r.usdVal, 0);
              const totJpy = rows.reduce((s, r) => s + r.jpyVal, 0);
              const totBtc = rows.reduce((s, r) => s + r.btcVal, 0);
              const totTier = getTier(Math.round(totUsd / P.ADA.usd));
              const ChgCell = ({ val }) => {
                if (val === undefined || val === null || val === "—") return <span className="text-gray-600">—</span>;
                return (
                  <span className={`flex items-center justify-end gap-0.5 ${val >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {val >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                    {val > 0 ? "+" : ""}{val}%
                  </span>
                );
              };
              return (
                <>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 text-left border-b border-gray-700">
                    <th className="pb-1.5 font-medium">Asset</th>
                    {activePeriods.map(p => <th key={p.key} className="pb-1.5 font-medium text-right">{p.label}</th>)}
                    {vc.amt && <th className="pb-1.5 font-medium text-right">保有量</th>}
                    {vc.usd && <th className="pb-1.5 font-medium text-right">USD評価</th>}
                    {vc.btc && <th className="pb-1.5 font-medium text-right">BTC換算</th>}
                    {vc.jpy && <th className="pb-1.5 font-medium text-right">JPY換算</th>}
                    {vc.hl && <th className="pb-1.5 font-medium text-right">高値</th>}
                    {vc.hl && <th className="pb-1.5 font-medium text-right">安値</th>}
                    {vc.tier && <th className="pb-1.5 font-medium text-right">ティア</th>}
                    {vc.nextTier && <th className="pb-1.5 font-medium text-right">次ティアまで</th>}
                    {vc.rank && <th className="pb-1.5 font-medium text-right">Rank</th>}
                    {vc.pct && <th className="pb-1.5 font-medium text-right">上位</th>}
                  </tr></thead>
                  <tbody>
                    {filteredRows.map(a => {
                      const adaEquiv = Math.round(a.usdVal / P.ADA.usd);
                      const rowTier = getTier(adaEquiv);
                      const hl = PRICE_HL[a.name];
                      const hlData = hl ? hl[hlPeriod] : null;
                      return (
                        <tr key={a.name} className={`border-b border-gray-700/50 ${a.primary ? "bg-blue-900/10" : "hover:bg-gray-700/30"}`}>
                          <td className="py-2 font-bold text-white">{a.name}{P[a.name]?._mock && <span className="text-xs text-yellow-600 font-normal ml-1" title="CoinGecko未上場・モック価格">*</span>}</td>
                          {activePeriods.map(p => <td key={p.key} className="py-2 text-right"><ChgCell val={a.changes[p.key]}/></td>)}
                          {vc.amt && <td className="py-2 text-right text-white font-bold">{H(fmt(a.amt))}</td>}
                          {vc.usd && <td className="py-2 text-right text-green-400">{H(`$${fmt(a.usdVal, 2)}`)}</td>}
                          {vc.btc && <td className="py-2 text-right text-orange-400">{H(`₿${a.btcVal.toFixed(4)}`)}</td>}
                          {vc.jpy && <td className="py-2 text-right text-yellow-400">{H(`¥${fmt(a.jpyVal)}`)}</td>}
                          {vc.hl && <td className="py-2 text-right text-green-300 font-mono">{hlData ? fmtPrice(hlData.hi) : '—'}</td>}
                          {vc.hl && <td className="py-2 text-right text-red-300 font-mono">{hlData ? fmtPrice(hlData.lo) : '—'}</td>}
                          {vc.tier && <td className="py-2 text-right whitespace-nowrap">
                            <span className="text-gray-600 text-xs mr-1">{rowTier.sub}</span>
                            <span style={{color: rowTier.color}}>{rowTier.emoji} {rowTier.name}</span>
                          </td>}
                          {vc.nextTier && (() => {
                            const nt = getNextTier(adaEquiv);
                            return <td className="py-2 text-right text-gray-400">{nt ? <span>→ {nt.emoji} <span className="text-white font-bold">{H(fmt(nt.min - adaEquiv))}</span> <span className="text-gray-600">ADA</span></span> : <span className="text-yellow-400">MAX</span>}</td>;
                          })()}
                          {vc.rank && <td className="py-2 text-right relative group">
                            <span className="text-yellow-400 font-bold cursor-help">{H(a.rank)}</span>
                            <span className="absolute hidden group-hover:block right-0 -top-6 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">{a.total} holders</span>
                          </td>}
                          {vc.pct && <td className="py-2 text-right text-green-400 font-medium">{a.pct}</td>}
                        </tr>
                      );
                    })}
                    {/* TOTAL row */}
                    <tr className="border-t-2 border-gray-600 bg-gray-700/30 font-bold">
                      <td className="py-2 text-white">TOTAL</td>
                      {activePeriods.map(p => <td key={p.key} className="py-2"></td>)}
                      {vc.amt && <td className="py-2 text-right text-gray-500">—</td>}
                      {vc.usd && <td className="py-2 text-right text-green-400">{H(`$${fmt(totUsd, 2)}`)}</td>}
                      {vc.btc && <td className="py-2 text-right text-orange-400">{H(`₿${totBtc.toFixed(4)}`)}</td>}
                      {vc.jpy && <td className="py-2 text-right text-yellow-400">{H(`¥${fmt(totJpy)}`)}</td>}
                      {vc.hl && <td className="py-2"></td>}
                      {vc.hl && <td className="py-2"></td>}
                      {vc.tier && <td className="py-2 text-right relative"
                        onMouseEnter={() => setShowAllTiers(true)} onMouseLeave={() => setShowAllTiers(false)}>
                        <span className="cursor-help whitespace-nowrap">
                          <span className="text-gray-600 text-xs mr-1">{totTier.sub}</span>
                          <span style={{color: totTier.color}}>{totTier.emoji} {totTier.name}</span>
                        </span>
                        {showAllTiers && (
                          <div className="absolute right-0 bottom-full mb-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 z-50 p-3 max-h-80 overflow-y-auto" style={{width: 'min(520px, 90vw)'}}>
                            <div className="text-xs font-bold text-gray-400 mb-2">全{TIERS.length}段階ティア（{MAJOR_TIERS.length}大ティア）</div>
                            {MAJOR_TIERS.map((mt, mi) => (
                              <div key={mi} className="mb-2">
                                <div className="text-xs font-bold px-2 py-1 rounded mb-1" style={{color: mt.color, backgroundColor: mt.color + '15'}}>
                                  {mt.emoji} {mt.name} <span className="text-gray-500 font-normal ml-1">{mt.range}</span>
                                </div>
                                <div className="space-y-0.5">
                                  {TIERS.filter(t => t.major === mi).map(t => {
                                    const cur = t.name === totTier.name;
                                    return (
                                      <div key={t.name} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${cur ? "bg-gray-700 border border-blue-500/60" : "hover:bg-gray-800"}`}>
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
                        )}
                      </td>}
                      {vc.nextTier && (() => {
                        const tnt = getNextTier(Math.round(totUsd / P.ADA.usd));
                        return <td className="py-2 text-right text-gray-400">{tnt ? <span>→ {tnt.emoji} <span className="text-white font-bold">{H(fmt(tnt.min - Math.round(totUsd / P.ADA.usd)))}</span></span> : <span className="text-yellow-400">MAX</span>}</td>;
                      })()}
                      {vc.rank && <td className="py-2"></td>}
                      {vc.pct && <td className="py-2"></td>}
                    </tr>
                  </tbody>
                </table>
                {hiddenCount > 0 && !showZeroUsd && (
                  <div className="text-center mt-2">
                    <button onClick={()=>setShowZeroUsd(true)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded">
                      + {hiddenCount}件の$0アセットを表示
                    </button>
                  </div>
                )}
                </>
              );
            })()}
          </div>
        </div>

        {/* ═══ Row 2: Balance History Chart ═══ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-2 sm:p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <TrendingUp size={14} className="text-blue-400"/>
              保有残高推移
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <PeriodBtns value={balPeriod} onChange={setBalPeriod}/>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">単位:</span>
                {[{k:"usd",l:"USD"},{k:"jpy",l:"JPY"},{k:"ada",l:"ADA"},{k:"btc",l:"BTC"}].map(u => (
                  <Btn key={u.k} active={chartUnit===u.k} onClick={()=>setChartUnit(u.k)} color="#3B82F6">{u.l}</Btn>
                ))}
              </div>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">残高:</span>
                {[{k:"ADA",c:"#3B82F6"},{k:"NIGHT",c:"#A78BFA"},{k:"SNEK",c:"#34D399"},{k:"MIN",c:"#FB923C"},{k:"TOTAL",c:"#F43F5E"}].map(a => (
                  <Btn key={a.k} active={chartAssets[a.k]} onClick={()=>setChartAssets({...chartAssets,[a.k]:!chartAssets[a.k]})} color={a.c}>{a.k}</Btn>
                ))}
              </div>
            </div>
          </div>
          {balChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 border border-dashed border-gray-700 rounded-lg">
              <TrendingUp size={20} className="mb-2 text-gray-600"/>
              <span className="text-sm">残高推移データなし</span>
              <span className="text-xs text-gray-600 mt-1">
                {wallets.length === 0
                  ? "ウォレットを登録し、CoinGecko APIから価格履歴を取得すると表示されます"
                  : "CoinGecko APIから90日間の価格履歴を取得できませんでした"}
              </span>
              <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded flex items-center gap-1 text-white"><RefreshCw size={10}/> 再取得</button>
            </div>
          ) : (() => {
            const unitPrefix = { usd: "$", jpy: "¥", ada: "₳", btc: "₿" }[chartUnit];
            const unitDec = { usd: 0, jpy: 0, ada: 0, btc: 4 }[chartUnit];
            const fmtU = (v) => `${unitPrefix}${fmt(v, unitDec)}`;
            const intv = Math.max(1, Math.floor(balChartData.length / 8));
            return (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={balChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
                    <XAxis dataKey="date" tick={{fill:"#6B7280",fontSize:9}} tickLine={false} interval={intv}/>
                    <YAxis tick={{fill:"#6B7280",fontSize:9}} tickLine={false} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : unitDec > 0 ? v.toFixed(unitDec) : `${v}`} width={50}/>
                    <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v, name) => [fmtU(v), `${name}残高`]}/>
                    {chartAssets.ADA && <Line type="monotone" dataKey="ADA" stroke="#3B82F6" strokeWidth={2} dot={false}/>}
                    {chartAssets.NIGHT && <Line type="monotone" dataKey="NIGHT" stroke="#A78BFA" strokeWidth={1.5} dot={false}/>}
                    {chartAssets.SNEK && <Line type="monotone" dataKey="SNEK" stroke="#34D399" strokeWidth={1.5} dot={false}/>}
                    {chartAssets.MIN && <Line type="monotone" dataKey="MIN" stroke="#FB923C" strokeWidth={1.5} dot={false}/>}
                    {chartAssets.TOTAL && <Line type="monotone" dataKey="TOTAL" stroke="#F43F5E" strokeWidth={2.5} dot={false} strokeDasharray="6 3"/>}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                  {chartAssets.ADA && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-blue-500"/>ADA</span>}
                  {chartAssets.NIGHT && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#A78BFA"}}/>NIGHT</span>}
                  {chartAssets.SNEK && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#34D399"}}/>SNEK</span>}
                  {chartAssets.MIN && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FB923C"}}/>MIN</span>}
                  {chartAssets.TOTAL && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#F43F5E"}}/>TOTAL</span>}
                </div>
              </>
            );
          })()}
        </div>

        {/* ═══ Row 3: Price Analysis Chart ═══ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-2 sm:p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <Activity size={14} className="text-purple-400"/>
              価格比較分析
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <PeriodBtns value={pricePeriod} onChange={setPricePeriod}/>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-1">比較:</span>
                {[{k:"indexed",l:"基準日比較"},{k:"mcap",l:"時価総額"},{k:"price",l:"価格"}].map(m => (
                  <Btn key={m.k} active={priceMode===m.k} onClick={()=>setPriceMode(m.k)} color="#A855F7">{m.l}</Btn>
                ))}
              </div>
              <div className="w-px h-4 bg-gray-700"/>
              <div className="flex items-center gap-1">
                {[
                  {k:"adaPrice",l:"ADA",c:"#818CF8"},{k:"btcPrice",l:"BTC",c:"#FB923C"},
                  {k:"ethPrice",l:"ETH",c:"#627EEA"},{k:"solPrice",l:"SOL",c:"#00FFA3"},
                  {k:"xrpPrice",l:"XRP",c:"#A8B8C8"},{k:"goldPrice",l:"金",c:"#FFD700"},
                  {k:"acwiPrice",l:"ACWI",c:"#E8553A"},
                ].map(c => (
                  <Btn key={c.k} active={showPriceOverlay[c.k]} onClick={()=>setShowPriceOverlay({...showPriceOverlay,[c.k]:!showPriceOverlay[c.k]})} color={c.c}>{c.l}</Btn>
                ))}
              </div>
            </div>
          </div>
          {priceChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 border border-dashed border-gray-700 rounded-lg">
              <Activity size={20} className="mb-2 text-gray-600"/>
              <span className="text-sm">価格履歴データ未取得</span>
              <span className="text-xs text-gray-600 mt-1">CoinGecko APIキーを設定すると取得できます</span>
            </div>
          ) : <>
          {/* Base date slider (only in indexed mode) */}
          {priceMode === "indexed" && (
            <div className="flex items-center gap-1.5 sm:gap-3 mb-2 px-1 flex-wrap">
              <span className="text-xs text-gray-500 whitespace-nowrap">基準日:</span>
              <span className="text-xs text-white font-bold bg-purple-600/30 border border-purple-500/50 px-2 py-0.5 rounded whitespace-nowrap">
                {priceFiltered[safeBaseIdx]?.date || "—"} = 100
              </span>
              <input
                type="range"
                min={0}
                max={priceFiltered.length - 1}
                value={safeBaseIdx}
                onChange={e => setBaseIdx(+e.target.value)}
                className="flex-1 h-1 accent-purple-500 cursor-pointer"
                style={{accentColor: "#A855F7"}}
              />
              <div className="flex items-center gap-1">
                <button onClick={() => setBaseIdx(0)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">最古</button>
                <button onClick={() => setBaseIdx(Math.floor(priceFiltered.length / 2))} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">中間</button>
                <button onClick={() => setBaseIdx(priceFiltered.length - 1)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">最新</button>
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
              {priceMode === "indexed" && <ReferenceLine y={100} stroke="#6366F1" strokeDasharray="4 4" label={{value:"基準日", fill:"#6366F1", fontSize:9, position:"insideTopRight"}}/>}
              <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={(v, name) => {
                const lbl = {adaPrice:"ADA",btcPrice:"BTC",ethPrice:"ETH",solPrice:"SOL",xrpPrice:"XRP",goldPrice:"金",acwiPrice:"ACWI"}[name]||name;
                if (priceMode === "indexed") {
                  const chg = v - 100;
                  const sign = chg >= 0 ? "+" : "";
                  return [`${sign}${chg.toFixed(1)}% (${priceFiltered[safeBaseIdx]?.date}比)`, lbl];
                }
                if (priceMode === "mcap") return [`$${fmt(v, 1)}B`, `${lbl} 時価総額`];
                return [`$${v >= 1 ? fmt(v, 2) : v.toFixed(6)}`, lbl];
              }}/>
              {showPriceOverlay.adaPrice && <Line type="monotone" dataKey="adaPrice" stroke="#818CF8" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.btcPrice && <Line type="monotone" dataKey="btcPrice" stroke="#FB923C" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.ethPrice && <Line type="monotone" dataKey="ethPrice" stroke="#627EEA" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.solPrice && <Line type="monotone" dataKey="solPrice" stroke="#00FFA3" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.xrpPrice && <Line type="monotone" dataKey="xrpPrice" stroke="#A8B8C8" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.goldPrice && <Line type="monotone" dataKey="goldPrice" stroke="#FFD700" strokeWidth={2} dot={false}/>}
              {showPriceOverlay.acwiPrice && <Line type="monotone" dataKey="acwiPrice" stroke="#E8553A" strokeWidth={2} dot={false}/>}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            {showPriceOverlay.adaPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#818CF8"}}/>ADA</span>}
            {showPriceOverlay.btcPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FB923C"}}/>BTC</span>}
            {showPriceOverlay.ethPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#627EEA"}}/>ETH</span>}
            {showPriceOverlay.solPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#00FFA3"}}/>SOL</span>}
            {showPriceOverlay.xrpPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#A8B8C8"}}/>XRP</span>}
            {showPriceOverlay.goldPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#FFD700"}}/>金</span>}
            {showPriceOverlay.acwiPrice && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{backgroundColor:"#E8553A"}}/>ACWI</span>}
          </div>
          </>}
        </div>

        {/* ═══ Row 4: Wallets + Manual ═══ */}
        <Section title="保有一覧（ウォレット＋取引所）" icon={<Wallet size={14} className="text-blue-400"/>} rightEl={<span className="text-xs text-gray-500">{wallets.length}ウォレット · {manual.length}手動</span>}>
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mb-2">
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="ウォレット名（任意）" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-36"/>
            <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="stake1... / addr1... を入力" className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"/>
            <button onClick={addWallet} disabled={bfStatus==="loading"} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 justify-center shrink-0">
              {bfStatus==="loading" ? <><Loader size={12} className="animate-spin"/> 取得中...</> : <><Plus size={12}/> Blockfrost追加</>}
            </button>
          </div>
          {bfStatus === "error" && bfError && <div className="text-xs text-red-400 mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1 flex items-center justify-between">{bfError}<button onClick={()=>{setBfStatus("idle");setBfError("")}} className="text-red-300 hover:text-white ml-2">✕</button></div>}
          {bfStatus === "ok" && <div className="text-xs text-green-400 mb-2">✓ ウォレットデータ取得完了（Blockfrost）</div>}
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mb-2">
            <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="取引所名" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-32"/>
            <input value={mAmt} onChange={e=>setMAmt(e.target.value)} placeholder="ADA数量" type="number" className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 w-full sm:w-28"/>
            <button onClick={addManual} className="bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 justify-center shrink-0"><Plus size={12}/> 手動追加</button>
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-1 mb-3"><Shield size={10} className="text-green-500"/> APIキーはブラウザ内のみ・外部送信なし</div>
          {wallets.length === 0 && manual.length === 0 && (
            <div className="text-center py-6 text-gray-500 border border-dashed border-gray-700 rounded-lg mb-3">
              <div className="text-lg mb-2">₳</div>
              <div className="text-sm mb-1">ウォレットが未登録です</div>
              <div className="text-xs">上の入力欄に <span className="text-blue-400 font-mono">stake1...</span> または <span className="text-blue-400 font-mono">addr1...</span> を入力して「Blockfrost追加」をクリック</div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                <th className="pb-1.5 font-medium">種別</th><th className="pb-1.5 font-medium">名前</th><th className="pb-1.5 font-medium">残高</th><th className="pb-1.5 font-medium hidden md:table-cell">アドレス</th><th className="pb-1.5 font-medium hidden sm:table-cell">プール</th><th className="pb-1.5 font-medium hidden lg:table-cell">DRep</th><th className="pb-1.5 font-medium hidden sm:table-cell">報酬</th><th className="pb-1.5 font-medium w-8"></th>
              </tr></thead>
              <tbody>
                {wallets.map(w => (
                  <tr key={`w-${w.id}`} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-1.5"><span className="text-xs bg-blue-900/40 text-blue-400 px-1 py-0.5 rounded">W</span></td>
                    <td className="py-1.5 text-white font-medium text-xs">{w.name}</td>
                    <td className="py-1.5 text-white font-bold text-xs">{H(`₳${fmt(w.bal)}`)}</td>
                    <td className="py-1.5 text-gray-400 font-mono text-xs hidden md:table-cell"><span title={w.stake}>{w.stake.slice(0,12)}...{w.stake.slice(-6)}</span><button onClick={()=>{navigator.clipboard.writeText(w.stake);}} className="text-gray-600 hover:text-gray-400 ml-1" title="コピー"><Copy size={8}/></button></td>
                    <td className="py-1.5 hidden sm:table-cell"><span className="text-blue-400 font-bold text-xs">[{w.pool}]</span></td>
                    <td className="py-1.5 text-purple-400 text-xs hidden lg:table-cell">{w.drep}</td>
                    <td className="py-1.5 text-green-400 text-xs hidden sm:table-cell">₳{fmt(w.rew, 1)}</td>
                    <td className="py-1.5"><button onClick={()=>removeWallet(w.id)} className="text-red-400 hover:text-red-300"><Trash2 size={10}/></button></td>
                  </tr>
                ))}
                {manual.map(e => (
                  <tr key={`m-${e.id}`} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-1.5"><span className="text-xs bg-orange-900/40 text-orange-400 px-1 py-0.5 rounded">手</span></td>
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
          {/* Native Token Assets */}
          {wallets.some(w => w.allAssets && w.allAssets.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-2"><Coins size={12} className="text-purple-400"/><span className="text-xs font-bold text-gray-400">ネイティブトークン一覧（Blockfrost取得）</span></div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 text-left border-b border-gray-800 sticky top-0 bg-gray-900">
                    <th className="pb-1.5 font-medium">トークン名</th>
                    <th className="pb-1.5 font-medium text-right">数量</th>
                    <th className="pb-1.5 font-medium">Policy ID</th>
                    <th className="pb-1.5 font-medium">ウォレット</th>
                  </tr></thead>
                  <tbody>
                    {wallets.flatMap(w => (w.allAssets || []).map(a => ({...a, walletName: w.name}))).map((a, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                        <td className="py-1 text-white font-medium">{a.name}</td>
                        <td className="py-1 text-right text-white font-mono">{fmt(a.quantity)}</td>
                        <td className="py-1 text-gray-500 font-mono text-xs">{a.policyId.slice(0,12)}...</td>
                        <td className="py-1 text-gray-400">{a.walletName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Alerts */}
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-2"><Bell size={12} className="text-yellow-400"/><span className="text-xs font-bold text-gray-400">アラート通知</span></div>
            <div className="flex gap-2 mb-2">
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="通知先メールアドレス" className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600"/>
              <button onClick={()=>{saveLS({email}); setEmailSaved(true); setTimeout(()=>setEmailSaved(false),2000);}} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"><Mail size={11}/> {emailSaved ? "✓ 保存済" : "保存"}</button>
            </div>
            <div className="text-xs text-yellow-600/80 bg-yellow-900/10 border border-yellow-800/30 rounded px-2 py-1 mb-2">
              メール通知はバックエンドサーバー未実装のため、現在はブラウザ通知のみ対応しています
            </div>
            {alertStatus !== "granted" && (
              <div className="mb-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1.5 flex items-center justify-between">
                <span>ブラウザ通知が許可されていません。アラートを受信するには通知を許可してください。</span>
                <button onClick={requestNotification} className="bg-yellow-600 hover:bg-yellow-500 px-2 py-0.5 rounded text-white ml-2 whitespace-nowrap">通知を許可</button>
              </div>
            )}
            {alertStatus === "granted" && (
              <div className="mb-2 text-xs text-green-400">✓ ブラウザ通知: 許可済み</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "pool", label: "プール停止/引退アラート", desc: "委任先プールが停止・引退予定の場合に通知" },
                { key: "pledge", label: "プレッジ不足アラート", desc: "実プレッジが宣言額を下回った場合に通知" },
                { key: "margin", label: "手数料変更アラート", desc: "マージンまたは固定費が変更された場合に通知" },
                { key: "blocks", label: "ブロック生成異常アラート", desc: "委任量に見合わないブロック生成不足を検出" },
                { key: "drep", label: "DRep未委任アラート", desc: "DRepが未設定の場合に通知" },
              ].map(a => (
                <div key={a.key} className="flex items-center justify-between bg-gray-950 rounded-lg px-3 py-2">
                  <div><div className="text-xs font-medium text-white">{a.label}</div><div className="text-xs text-gray-600">{a.desc}</div></div>
                  <div className={`w-8 h-5 rounded-full relative cursor-pointer shrink-0 ml-2 ${alerts[a.key]?"bg-blue-600":"bg-gray-700"}`} onClick={()=>setAlerts({...alerts,[a.key]:!alerts[a.key]})}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${alerts[a.key]?"left-4":"left-0.5"}`}/>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={checkAlerts} className="mt-2 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded flex items-center gap-1"><Bell size={10}/> アラートを今すぐチェック</button>
            {poolAlerts.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-bold text-gray-400 mb-1">検出されたアラート ({poolAlerts.length}件)</div>
                {poolAlerts.map((a, i) => (
                  <div key={i} className={`text-xs px-2 py-1.5 rounded border ${a.severity === "warn" ? "bg-red-900/20 border-red-800 text-red-300" : "bg-yellow-900/20 border-yellow-800 text-yellow-300"}`}>
                    {a.severity === "warn" ? "⚠" : "ℹ"} {a.msg}
                  </div>
                ))}
              </div>
            )}
            {poolAlerts.length === 0 && wallets.some(w => w.poolInfo) && (
              <div className="mt-2 text-xs text-green-400">✓ プール異常なし</div>
            )}
          </div>
        </Section>

        {/* ═══ Row 5: Rewards ═══ */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-200"><Coins size={14} className="text-green-400"/> 報酬サマリー</div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={csvCurrency} onChange={e => setCsvCurrency(e.target.value)} className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white">
                <option value="jpy">JPY (日本円)</option>
                <option value="usd">USD (米ドル)</option>
              </select>
              <select value={csvTimezone} onChange={e => setCsvTimezone(e.target.value)} className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white">
                <option value="JST">JST (日本時間)</option>
                <option value="UTC">UTC</option>
              </select>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <input type="checkbox" checked={csvRewardSplit} onChange={e => setCsvRewardSplit(e.target.checked)} className="rounded" />
                委任/運営分離
              </label>
              <button onClick={exportCSV} className="text-xs bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded flex items-center gap-1"><Download size={10}/> CSV出力</button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 text-xs mb-3 flex-wrap">
            <div><span className="text-gray-500">Staking:</span> <span className="text-green-400 font-bold">{H(`₳ ${fmt(totalRew,1)}`)}</span></div>
            <div><span className="text-gray-500">Catalyst:</span> <span className="text-purple-400 font-bold">{H(`₳ ${fmt(totalCat)}`)}</span></div>
            <div><span className="text-gray-500">合計:</span> <span className="text-yellow-400 font-bold">{H(`₳ ${fmt(totalRew+totalCat,1)}`)}</span> <span className="text-gray-600">({H(`$${fmt((totalRew+totalCat)*P.ADA.usd)}`)}&nbsp;/&nbsp;{H(`¥${fmt((totalRew+totalCat)*P.ADA.jpy)}`)})</span></div>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={rewardData.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937"/>
              <XAxis dataKey="epoch" tick={{fill:"#6B7280",fontSize:8}} tickLine={false}/>
              <YAxis tick={{fill:"#6B7280",fontSize:8}} tickLine={false} width={20}/>
              <Tooltip contentStyle={{backgroundColor:"#111827",border:"1px solid #374151",borderRadius:6,fontSize:10}} formatter={v=>[`₳ ${v}`,"報酬"]}/>
              <Bar dataKey="ada" fill="#10B981" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ═══ Row 6: Privacy + Advanced ═══ */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Shield size={12} className="text-green-500 shrink-0"/>
            <span className="text-xs leading-relaxed">残高はBlockfrostで取得 · 価格はCoinGecko · APIキーはローカル保存</span>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="ml-auto text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded flex items-center gap-1 shrink-0">
              <Settings size={10}/> {showAdvanced ? "閉じる" : "高度な設定"}
            </button>
          </div>
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              {/* Blockfrost Settings */}
              <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><Wallet size={11}/> Blockfrost API設定（残高・ステーキング取得用）</div>
              <div className="grid grid-cols-1 gap-2 mb-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Blockfrost Project ID（mainnet）</label>
                  <div className="flex gap-2">
                    <input type="text" value={bfKey} onChange={e => setBfKey(e.target.value)} className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white" placeholder="mainnetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
                    <button onClick={refreshWallets} disabled={bfStatus==="loading" || !bfKey} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1 rounded text-xs flex items-center gap-1">
                      {bfStatus==="loading" ? <><Loader size={11} className="animate-spin"/> 更新中</> : <><RefreshCw size={11}/> 全ウォレット更新</>}
                    </button>
                  </div>
                  <span className="text-xs text-gray-600 mt-0.5 block">無料プラン: blockfrost.io で取得（50,000回/日）· 残高・委任先・報酬をオンチェーン取得</span>
                </div>
              </div>
              {bfStatus === "ok" && <div className="mb-3 text-xs text-green-400">✓ Blockfrostウォレットデータ取得済み</div>}
              {bfStatus === "error" && bfError && <div className="mb-3 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1">{bfError}</div>}

              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">DBSync接続設定<span className="text-xs bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">将来実装予定</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[{l:"ホスト",v:"localhost"},{l:"ポート",v:"5432"},{l:"DB",v:"cexplorer"},{l:"ユーザー",v:"cardano"}].map(f=>(
                    <div key={f.l}><label className="text-xs text-gray-600 block">{f.l}</label><input defaultValue={f.v} className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white"/></div>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled className="bg-gray-700 text-gray-500 cursor-not-allowed px-3 py-1 rounded text-xs flex items-center gap-1" title="DBSync接続はサーバーサイド実装が必要です"><Database size={11}/> 接続テスト（未実装）</button>
                  <button onClick={()=>{
                    // Export wallets + manual + settings as JSON
                    const data = { wallets, manual, email, alerts, jpyRate, avKey, bfKey, exportDate: new Date().toISOString() };
                    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
                    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cardanowatch-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
                  }} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs flex items-center gap-1"><Download size={11}/> エクスポート</button>
                  <button onClick={()=>{
                    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
                    input.onchange = (ev) => {
                      const file = ev.target.files[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const data = JSON.parse(e.target.result);
                          if (data.wallets) setWallets(data.wallets);
                          if (data.manual) setManual(data.manual);
                          if (data.email) setEmail(data.email);
                          if (data.alerts) setAlerts(data.alerts);
                          if (data.jpyRate) setJpyRate(data.jpyRate);
                          if (data.avKey) setAvKey(data.avKey);
                          if (data.bfKey) setBfKey(data.bfKey);
                          alert("インポート完了");
                        } catch { alert("JSONファイルの読み込みに失敗しました"); }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs flex items-center gap-1"><RefreshCw size={11}/> インポート</button>
                </div>
              </div>

              {/* API Settings */}
              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><Activity size={11}/> 価格API設定</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">CoinGecko Demo APIキー</label>
                    <input type="text" value={cgKey} onChange={e => setCgKey(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white" placeholder="CG-xxxxxxxxxx"/>
                    <span className="text-xs text-gray-600 mt-0.5 block">無料: coingecko.com/en/api で取得</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">USD/JPY レート</label>
                    <input type="number" value={jpyRate} onChange={e => setJpyRate(+e.target.value || 150)} className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white" placeholder="150"/>
                    <span className="text-xs text-gray-600 mt-0.5 block">円建て表示用（CoinGeckoはUSD取得）</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Alpha Vantage APIキー（ACWI用）</label>
                    <input type="text" value={avKey} onChange={e => setAvKey(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white" placeholder="無料キー: alphavantage.co/support/#api-key"/>
                    <span className="text-xs text-gray-600 mt-0.5 block">空欄の場合ACWIは取得しません</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={fetchAllData} disabled={apiStatus==="loading"} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1 rounded text-xs flex items-center gap-1">
                    {apiStatus==="loading" ? <><Loader size={11} className="animate-spin"/> 取得中...</> : <><RefreshCw size={11}/> 価格データ取得</>}
                  </button>
                  <span className="text-xs text-gray-600">
                    CoinGecko無料API（30回/分） · ADA/BTC/ETH/SOL/XRP/金(PAXG)
                  </span>
                </div>
                {apiStatus === "error" && <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1">{apiError}</div>}
                {apiStatus === "ok" && <div className="mt-2 text-xs text-green-400">✓ 価格データ取得完了 — {lastFetch?.toLocaleString("ja-JP")}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-gray-700 py-2">ADATOOL ダッシュボード — ADAホルダー向けプライベートダッシュボード</div>
      </div>
    </div>
  );
}
