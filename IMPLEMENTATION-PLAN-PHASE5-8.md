# adatool.net — Cexplorer機能ギャップ分析 & 実装計画

## 現在のadatool (Phase 1–4)
| ページ | ステータス |
|--------|-----------|
| Dashboard (/, stats, blocks, DReps) | ✅ |
| /blocks, /block/[hash] | ✅ |
| /txs, /tx/[hash] | ✅ |
| /epochs, /epoch/[no] | ✅ |
| /pools, /pool/[id], /pool/[id]/blocks | ✅ |
| /pools/compare | ✅ |
| /assets, /asset/[fp], /asset/[fp]/holders | ✅ |
| /governance, /governance/[hash]/[index] | ✅ |
| /dreps, /drep/[id] | ✅ |
| /committee | ✅ |
| /protocol | ✅ |
| /stake-distribution | ✅ |
| /whales | ✅ |
| /richlist | ✅ |
| /charts (tx-volume) | ✅ |
| /governance/simulator | ✅ |
| /wallet | ✅ (HTTPS後) |
| /address/[addr] | ✅ |
| /search | ✅ |

---

## Cexplorer未実装機能一覧（優先度順）

### 🔴 Phase 5: Blockchain拡張 + ガバナンス強化（高優先）
db-syncに全データあり。ユーザーインパクト大。

| # | 機能 | Cexplorerの場所 | DB テーブル | 難易度 |
|---|------|----------------|------------|--------|
| 1 | **Votes (投票一覧)** | Governance > Votes | voting_procedure + gov_action_proposal | ★★ |
| 2 | **DRep delegations** | Governance > DRep delegations | delegation_vote | ★★ |
| 3 | **Constitution** | Governance > Constitution | constitution + off_chain_vote_data | ★☆ |
| 4 | **Treasury withdrawals** | Governance > Treasury | treasury_withdrawal | ★★ |
| 5 | **TX Metadata** | Blockchain > Transactions metadata | tx_metadata | ★★ |
| 6 | **Contract TXs** | Blockchain > Contract transactions | script + redeemer | ★★★ |
| 7 | **Rewards withdrawals** | Staking > Rewards withdrawals | withdrawal | ★★ |

### 🟡 Phase 6: Staking深掘り（中優先）
プール関連の詳細ページ群。

| # | 機能 | Cexplorerの場所 | DB テーブル | 難易度 |
|---|------|----------------|------------|--------|
| 8 | **Live delegations** | Staking > Live delegations | delegation | ★★ |
| 9 | **New pools** | Staking > New pools | pool_update (最新登録) | ★☆ |
| 10 | **Retired pools** | Staking > Retired pools | pool_retire | ★☆ |
| 11 | **Pool updates** | Staking > Pool updates | pool_update | ★★ |
| 12 | **Multi-pool delegators** | Staking > Multi-pool delegators | delegation GROUP BY addr | ★★★ |
| 13 | **Rewards checker** | Staking > Rewards checker | reward テーブル | ★★ |
| 14 | **Certificates** | Staking/Governance > Certificates | stake_registration, delegation等 | ★★★ |

### 🟢 Phase 7: Analytics（中優先）
統計・分析ページ群。Cexplorerの「Analytics」メガメニュー相当。

| # | 機能 | Cexplorerの場所 | DB テーブル | 難易度 |
|---|------|----------------|------------|--------|
| 15 | **Pots (ADA配分可視化)** | Analytics > Pots | ada_pots | ★☆ |
| 16 | **Treasury projection** | Analytics > Treasury projection | ada_pots + 計算 | ★★ |
| 17 | **Top addresses** | Analytics > Top addresses | tx_out (UTXO集計) | ★★★ |
| 18 | **Top staking accounts** | Analytics > Top staking accounts | epoch_stake | ★★ |
| 19 | **Wealth composition** | Analytics > Wealth composition | epoch_stake バケット | ★★ |
| 20 | **Block versions** | Analytics > Block versions | block.proto_major/minor | ★☆ |
| 21 | **Genesis addresses** | Analytics > Genesis addresses | tx_out WHERE tx_id ∈ genesis | ★★ |
| 22 | **Transaction charts** | Analytics > Transactions | tx + block集計 | ★★ |
| 23 | **Pool issues** | Analytics > Pool issues | pool_update anomalies | ★★ |
| 24 | **Average pools** | Analytics > Average pools | epoch_stake集計 | ★★ |

### 🔵 Phase 8: Tokens拡張 + Tools（低優先）
一部外部データ必要。

| # | 機能 | Cexplorerの場所 | DB テーブル | 難易度 |
|---|------|----------------|------------|--------|
| 25 | **Recent tokens** | Tokens > Recent | multi_asset ORDER BY id DESC | ★☆ |
| 26 | **Token Dashboard** | Tokens > Dashboard | multi_asset + 集計 | ★★ |
| 27 | **NFT list/recent** | NFTs > List/Recent | multi_asset WHERE quantity=1 | ★★ |
| 28 | **Stablecoins** | Tokens > Stablecoins | multi_asset (known fingerprints) | ★★ |
| 29 | **Address inspector** | More > Address inspector | - (クライアント解析) | ★☆ |
| 30 | **Epoch calendar** | More > Epoch calendar | epoch テーブル + 計算 | ★☆ |
| 31 | **$handle DNS** | More > $handle DNS | multi_asset (ADA Handle) | ★★ |

### ⚪ 未実装（外部データ依存 or 低ROI）
- Swap / DEX → 外部API (MinSwap, SundaeSwap等) 必要
- TVL / dApps Ranklist → DeFiLlama等の外部API必要
- Energy consumption → 推定値、低需要
- Tax tool → 複雑すぎる、法的リスク
- Pool debug → ニッチすぎる
- Script verification / UPLC viewer → 専門的

---

## 推奨実装順序

### Phase 5 (次に実装 — API 7エンドポイント + フロント7ページ)
```
所要時間見込み: 1セッション
新規API: /votes, /drep-delegations, /constitution,
         /treasury-withdrawals, /tx-metadata,
         /contract-txs, /rewards-withdrawals
新規ページ: 同上7ページ
```

**Phase 5で得られるもの:**
- Cexplorerの「Governance」メニューをほぼ完全カバー
- 「Blockchain」メニューを完全カバー
- ステーキング報酬の引き出し追跡

### Phase 6 (Staking強化 — API 7エンドポイント + フロント7ページ)
```
所要時間見込み: 1セッション
新規API: /delegations, /pools/new, /pools/retired,
         /pool-updates, /multi-pool-delegators,
         /rewards-check/:addr, /certificates
新規ページ: 同上7ページ
```

**Phase 6で得られるもの:**
- Cexplorerの「Staking」メニューを完全カバー

### Phase 7 (Analytics — API 10エンドポイント + フロント10ページ)
```
所要時間見込み: 1–2セッション
新規API: /pots, /treasury-projection, /top-addresses,
         /top-stakers, /wealth-composition, /block-versions,
         /genesis-addresses, /tx-charts, /pool-issues, /avg-pools
新規ページ: Analytics配下10ページ
```

### Phase 8 (Tokens + Tools)
```
所要時間見込み: 1セッション
```

---

## ナビゲーション改善案
現在のフラットなナビ → **Cexplorer風ドロップダウンメニュー**に変更

```
Blockchain ▼     Staking ▼      Governance ▼    Tokens ▼    Analytics ▼
├ Blocks         ├ Pools         ├ Actions        ├ List       ├ Charts
├ TXs            ├ New           ├ DReps          ├ Recent     ├ Pots
├ Epochs         ├ Retired       ├ Committee      ├ NFTs       ├ Top Addresses
├ Contract TXs   ├ Delegations   ├ Votes          └ Stables    ├ Wealth
├ TX Metadata    ├ Rewards       ├ DRep Deleg.                 ├ Stake Dist.
└ Assets         ├ Multi-pool    ├ Constitution                └ Treasury
                 ├ Certificates  ├ Treasury
                 └ Checker       └ Simulator
```
