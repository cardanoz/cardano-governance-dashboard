# ADAtool.net Enhancement Roadmap

## Current State (Phase 1-7 Complete)
34 pages all operational: Dashboard, Blocks, Txs, Epochs, Pools, Governance, DReps, Committee, Protocol, Stake Distribution, Whales, Rich List, Charts, Votes, DRep Delegations, Constitution, Treasury, Tx Metadata, Contract Txs, Rewards Withdrawals, Delegations, Pool Management (New/Retired/Updates), Certificates, Rewards Checker, Analytics (Pots, Treasury Projection, Top Addresses, Top Stakers, Wealth, Block Versions, Genesis, Tx Charts)

---

## Phase 8: Token & NFT Explorer (High Impact)
**Priority: Critical — Most requested feature for any Cardano explorer**

### 8.1 Native Assets
- `/tokens` — Top tokens by holder count & volume
- `/token/{policy}.{name}` — Token detail: supply, holders, transactions, price history
- `/token/{policy}.{name}/holders` — Paginated holder list with balance distribution
- API: `/tokens`, `/token/:policy/:name`, `/token/:policy/:name/holders`, `/token/:policy/:name/txs`
- Tables: `multi_asset`, `ma_tx_out`, `ma_tx_mint`

### 8.2 NFT Gallery
- `/nfts` — Trending NFT collections (by mint/transfer volume)
- `/nft/{policy}` — Collection overview: floor price proxy, minting activity, metadata
- `/nft/{policy}/{name}` — Individual NFT: metadata, image (IPFS gateway), ownership history
- API: `/nfts/trending`, `/nft/:policy`, `/nft/:policy/:name`
- On-chain metadata parsing (CIP-25, CIP-68)

### 8.3 Token Portfolio View
- `/address/{addr}/tokens` — All native assets held by an address
- Breakdown by token type (fungible vs NFT)

**Estimated effort: 8-10 endpoints, 6-8 pages**

---

## Phase 9: Smart Contract & Plutus Explorer (High Impact)
**Priority: High — Differentiator for developer-focused users**

### 9.1 Script Registry
- `/scripts` — List of active Plutus & native scripts by usage frequency
- `/script/{hash}` — Script detail: type (Plutus V1/V2/V3, native), size, redeemer stats
- API: `/scripts`, `/script/:hash`, `/script/:hash/txs`
- Tables: `script`, `redeemer`, `datum`

### 9.2 Datum & Redeemer Viewer
- `/tx/{hash}/contracts` — All scripts invoked in a transaction
- Inline datum display (CBOR decode → JSON)
- Redeemer display with execution units (mem/steps)
- Cost model visualization

### 9.3 DApp Dashboard
- `/dapps` — Top DApps by transaction volume (Minswap, SundaeSwap, JPG Store, etc.)
- Known script address labeling (community-maintained registry)
- Daily/weekly active users per DApp

**Estimated effort: 6-8 endpoints, 4-6 pages**

---

## Phase 10: Enhanced Search & Detail Pages (Medium Impact)
**Priority: High — Core UX improvement**

### 10.1 Universal Search
- Current search → Enhanced with:
  - Token name/ticker search
  - Pool ticker search
  - Stake key search
  - Block number search
  - Auto-detect input type (hash, address, epoch, block, pool ticker)

### 10.2 Improved Detail Pages
- `/block/{hash}` — Add pool link, previous/next block navigation, output/fees summary
- `/tx/{hash}` — UTXO inputs/outputs with ADA + token amounts, metadata tab, contract tab
- `/address/{addr}` — Token holdings tab, staking info, transaction history with pagination
- `/pool/{hash}` — Delegator count, blocks produced history, reward history, saturation meter
- `/epoch/{no}` — Block producers breakdown, fees trend, active stake

### 10.3 Pagination
- All list pages: server-side pagination with `?page=N` query param
- Infinite scroll alternative for mobile

**Estimated effort: 10-12 endpoint enhancements, 8-10 page rewrites**

---

## Phase 11: Real-Time Features (Medium Impact)
**Priority: Medium — Competitive advantage over static explorers**

### 11.1 Live Block Feed
- WebSocket or SSE for new blocks
- Auto-updating block list on `/blocks`
- Block notification toast

### 11.2 Mempool Viewer (if available)
- `/mempool` — Pending transactions (requires cardano-node mempool integration)
- Estimated confirmation time

### 11.3 Live Stats Dashboard
- Real-time TPS counter
- Active connections count
- Current slot progress within epoch

**Estimated effort: 3-4 new API endpoints + WebSocket infrastructure**

---

## Phase 12: User Experience & Design (Medium Impact)
**Priority: Medium — Polish & professionalism**

### 12.1 Responsive Mobile Design
- Full mobile-first responsive layout
- Hamburger navigation with dropdown categories
- Touch-friendly table scrolling
- Collapsible detail sections

### 12.2 Light/Dark Theme Toggle
- Currently dark-only → Add light theme
- User preference stored in localStorage
- System preference detection

### 12.3 Visualizations & Charts
- Epoch rewards trend chart (recharts/d3)
- Pool saturation bubble chart
- ADA distribution pie chart on wealth page
- Token volume bar charts
- Network activity heatmap (blocks per hour)

### 12.4 Breadcrumb Navigation
- Context-aware breadcrumbs on all detail pages
- Back/forward history-aware

**Estimated effort: Frontend-only, 2-3 weeks**

---

## Phase 13: API Documentation & Public API (Low-Medium Impact)
**Priority: Medium — Community value & SEO**

### 13.1 Public API Docs
- `/api/docs` — Swagger/OpenAPI interactive documentation
- Rate limiting (100 req/min free tier)
- API key system for higher limits

### 13.2 Developer Portal
- `/developers` — Quick start guide
- Code examples (curl, JavaScript, Python)
- Webhook registration for new blocks/txs

### 13.3 Data Export
- CSV export button on all table pages
- JSON download option
- Historical data bulk export

**Estimated effort: 3-5 new pages + API middleware**

---

## Phase 14: Advanced Analytics (Low-Medium Impact)
**Priority: Lower — Power user features**

### 14.1 Network Analytics
- `/analytics/network` — Daily active addresses, new addresses, transaction volume trends
- `/analytics/defi` — DEX volume, TVL proxy, liquidity metrics
- `/analytics/governance` — Voting participation trends, DRep activity scores

### 14.2 Pool Analytics
- `/analytics/pools` — Pool landscape: active/retiring, saturation distribution
- MAV (Moving Average Variance) for pool performance
- Pool comparison tool (select 2-3 pools side by side)

### 14.3 Address Analytics
- Whale movement alerts
- Address clustering heuristics
- Large transaction monitor

**Estimated effort: 8-10 endpoints, 5-7 pages**

---

## Phase 15: Internationalization & SEO (Lower Impact)
**Priority: Lower — Growth features**

### 15.1 Multi-language
- Japanese (primary), English, Spanish, Portuguese
- i18n framework (next-intl)
- Language switcher in header

### 15.2 SEO Optimization
- Dynamic meta tags for every page
- Open Graph / Twitter Card metadata
- Sitemap.xml generation
- Schema.org structured data for blocks/txs

### 15.3 Social Features
- Share buttons on block/tx/pool pages
- Embed widgets (pool stats, address balance)
- Twitter bot for large transactions

**Estimated effort: 2-3 weeks**

---

## Phase 16: Infrastructure & Performance
**Priority: Ongoing**

### 16.1 Performance
- Redis cache hit rate monitoring
- DB query optimization (add missing indexes)
- CDN for static assets (CloudFront)
- Image optimization for NFTs

### 16.2 Monitoring
- Uptime monitoring (UptimeRobot/Grafana)
- API response time tracking
- Error rate dashboard
- Alerting on 500 errors

### 16.3 CI/CD
- GitHub Actions: lint → build → test → deploy
- Staging environment
- Automated DB migration scripts
- Docker containerization

---

## Recommended Implementation Order

| Priority | Phase | Impact | Effort | Timeline |
|----------|-------|--------|--------|----------|
| 1 | **Phase 10**: Search & Detail Pages | High | Medium | 1-2 weeks |
| 2 | **Phase 8**: Token & NFT Explorer | Critical | High | 2-3 weeks |
| 3 | **Phase 12**: UX & Design | Medium | Medium | 1-2 weeks |
| 4 | **Phase 9**: Smart Contracts | High | High | 2-3 weeks |
| 5 | **Phase 13**: API Docs & Public API | Medium | Low | 1 week |
| 6 | **Phase 11**: Real-Time Features | Medium | High | 2 weeks |
| 7 | **Phase 14**: Advanced Analytics | Low-Med | Medium | 2 weeks |
| 8 | **Phase 15**: i18n & SEO | Lower | Medium | 1-2 weeks |
| 9 | **Phase 16**: Infrastructure | Ongoing | Ongoing | Continuous |

**Total estimated timeline: 12-18 weeks for full implementation**

---

## Quick Wins (Can Do Now)
1. Add pagination to all list pages (1-2 days)
2. Improve search to auto-detect input type (1 day)
3. Add CSV export buttons (1 day)
4. Add meta tags for SEO (half day)
5. Add pool ticker search (half day)
6. Mobile hamburger menu (1 day)
