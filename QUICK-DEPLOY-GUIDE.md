# Quick Deployment Guide - Phase 8, 10, 11, 14

## TL;DR - Deploy in 5 Minutes

### Step 1: Run the Implementation Script
```bash
python3 /sessions/gallant-inspiring-johnson/mnt/cardano-governance-dashboard/implement-phase8-14.py
```
✓ This creates all API endpoints and frontend pages

### Step 2: Copy to Production
```bash
# Copy API
cp /sessions/gallant-inspiring-johnson/mnt/cardano-governance-dashboard/adatool-api-index.js \
   /home/ubuntu/adatool-api/src/index.js

# Copy pages
cp -r /sessions/gallant-inspiring-johnson/mnt/cardano-governance-dashboard/pages/* \
   /home/ubuntu/adatool-frontend/src/app/\(explorer\)/
```

### Step 3: Update Header (Manual)
Edit `/home/ubuntu/adatool-frontend/src/components/layout/Header.tsx`

Add these lines to navigation:
```tsx
// Blockchain section - add:
{ label: "Tokens", href: "/tokens" },
{ label: "Token Mints", href: "/tokens/mints" },

// New Live section:
{ label: "Live", href: "/live" },

// Analytics section - add:
{ label: "Network", href: "/analytics/network" },
{ label: "Pool Landscape", href: "/analytics/pool-landscape" },
{ label: "Governance", href: "/analytics/governance" },
```

### Step 4: Build & Deploy
```bash
# Build frontend
cd /home/ubuntu/adatool-frontend && npm run build

# Restart API (systemd)
sudo systemctl restart adatool-api

# OR manually:
cd /home/ubuntu/adatool-api && npm start
```

### Step 5: Test
```bash
# Test API endpoints
curl http://localhost:3001/tokens
curl http://localhost:3001/stats/live

# Open browser
# http://adatool.net/tokens
# http://adatool.net/live
# http://adatool.net/analytics/network
```

---

## What Was Added

### Phase 8: Token Explorer
- `/tokens` - Token list
- `/token/[fingerprint]` - Token details
- `/token/[fingerprint]/holders` - Top holders
- `/tokens/mints` - Recent mints

### Phase 10: Enhanced Search & Pages
- `/search` - Universal search (improved)
- `/pool/[hash]/delegators` - Pool delegators
- `/pool/[hash]/blocks` - Pool block history
- `/address/[addr]/tokens` - Address token holdings

### Phase 11: Real-time
- `/live` - Live block feed with network stats
- Uses Server-Sent Events (SSE)

### Phase 14: Analytics
- `/analytics/network` - 30-day network activity
- `/analytics/pool-landscape` - Pool ecosystem stats
- `/analytics/governance` - Governance participation

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Cache |
|----------|--------|---------|-------|
| `/tokens?page=1&limit=20` | GET | List tokens | 120s |
| `/token/:fingerprint` | GET | Token details | 300s |
| `/token/:fingerprint/holders?limit=20` | GET | Top holders | 300s |
| `/tokens/mints?limit=20` | GET | Recent mints | 60s |
| `/blocks?page=1&limit=20` | GET | Block pagination | 60s |
| `/txs?page=1&limit=20` | GET | TX pagination | 60s |
| `/pool/:hash/delegators?limit=20` | GET | Pool delegators | 300s |
| `/pool/:hash/blocks?limit=20` | GET | Pool blocks | 300s |
| `/address/:addr/tokens` | GET | Address tokens | 300s |
| `/search?q=xxx` | GET | Universal search | - |
| `/stream/blocks` | GET (SSE) | Live blocks | - |
| `/stats/live` | GET | Live stats | 10s |
| `/analytics/network` | GET | 30-day analytics | 3600s |
| `/analytics/pool-landscape` | GET | Pool stats | 3600s |
| `/analytics/governance-stats` | GET | Governance stats | 3600s |

---

## Frontend Pages Reference

| URL | File | Type | Phase |
|-----|------|------|-------|
| `/tokens` | tokens/page.tsx | Server | 8 |
| `/token/[fp]` | token/[fingerprint]/page.tsx | Server | 8 |
| `/token/[fp]/holders` | token/[fingerprint]/holders/page.tsx | Server | 8 |
| `/tokens/mints` | tokens/mints/page.tsx | Server | 8 |
| `/search` | search/page.tsx | Server | 10 |
| `/pool/[h]/delegators` | pool/[hash]/delegators/page.tsx | Server | 10 |
| `/pool/[h]/blocks` | pool/[hash]/blocks/page.tsx | Server | 10 |
| `/address/[a]/tokens` | address/[addr]/tokens/page.tsx | Server | 10 |
| `/live` | live/page.tsx | Client | 11 |
| `/analytics/network` | analytics/network/page.tsx | Server | 14 |
| `/analytics/pool-landscape` | analytics/pool-landscape/page.tsx | Server | 14 |
| `/analytics/governance` | analytics/governance/page.tsx | Server | 14 |

---

## Troubleshooting

### Blank pages appear
```bash
# Check API is running
curl http://localhost:3001/health

# Check logs
sudo journalctl -u adatool-api -f

# Restart service
sudo systemctl restart adatool-api
```

### 404 errors on new pages
```bash
# Rebuild frontend
cd /home/ubuntu/adatool-frontend
npm run build

# Clear Next.js cache
rm -rf /home/ubuntu/adatool-frontend/.next
npm run build
```

### API returning 500 errors
```bash
# Check database connection
psql archive adatool_api -c "SELECT 1;"

# Clear Redis cache
redis-cli FLUSHDB

# Restart API
sudo systemctl restart adatool-api
```

### Pages load slowly
```bash
# Monitor Redis cache hits
redis-cli INFO stats | grep hits

# Check database query performance
sudo tail -f /var/log/postgresql/postgresql.log
```

---

## Environment Variables

Ensure these are set in API environment:

```env
# API
PORT=3001
DATABASE_URL=postgresql://adatool_api:password@localhost/archive
REDIS_URL=redis://localhost:6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## File Locations Summary

| Type | Path |
|------|------|
| API Main | `/home/ubuntu/adatool-api/src/index.js` |
| Frontend Base | `/home/ubuntu/adatool-frontend/src/app/(explorer)/` |
| Header Nav | `/home/ubuntu/adatool-frontend/src/components/layout/Header.tsx` |
| Implementation Script | `/sessions/gallant-inspiring-johnson/mnt/cardano-governance-dashboard/implement-phase8-14.py` |
| Implementation Docs | `/sessions/gallant-inspiring-johnson/mnt/cardano-governance-dashboard/IMPLEMENTATION-SUMMARY.md` |

---

## Database Query Examples

### Test token data
```sql
-- List tokens
SELECT fingerprint, COUNT(*) as cnt FROM multi_asset LIMIT 5;

-- Get token details
SELECT * FROM multi_asset WHERE fingerprint = 'asset1...' LIMIT 1;

-- Count token holders
SELECT COUNT(DISTINCT address) FROM tx_out WHERE id IN (
  SELECT tx_out_id FROM ma_tx_out WHERE ident = (SELECT id FROM multi_asset WHERE fingerprint = 'asset1...')
);
```

### Test pool data
```sql
-- List pools
SELECT view FROM pool_hash LIMIT 5;

-- Get pool delegators
SELECT COUNT(DISTINCT addr_id) FROM delegation WHERE pool_hashid = (SELECT id FROM pool_hash WHERE view = 'pool1...');

-- Get pool blocks
SELECT COUNT(*) FROM block WHERE leader_id = (SELECT id FROM pool_hash WHERE view = 'pool1...');
```

---

## Performance Tips

1. **Cache monitoring:**
   ```bash
   redis-cli KEYS "tokens:*" | wc -l  # Count cached pages
   ```

2. **Query optimization:**
   - Indexes are critical on: `multi_asset`, `tx_out`, `pool_hash`, `delegation`
   - Add missing indexes if queries timeout

3. **Load testing:**
   ```bash
   # Test API under load
   ab -n 1000 -c 10 http://localhost:3001/tokens
   ```

---

## Rollback Plan

If something breaks:

```bash
# Restore previous API version
git checkout HEAD~1 /home/ubuntu/adatool-api/src/index.js

# Restore frontend pages
git checkout HEAD~1 /home/ubuntu/adatool-frontend/src/app/

# Restart
sudo systemctl restart adatool-api
cd /home/ubuntu/adatool-frontend && npm run build
```

---

## Support & Validation

**Before considering deployment complete, verify:**
- [ ] All 15 API endpoints respond (200 OK, valid JSON)
- [ ] All 12 frontend pages render without errors
- [ ] Header navigation includes all 7 new menu items
- [ ] Live page updates blocks every 5-20 seconds
- [ ] Analytics pages show data from last 30 days
- [ ] Token search works with real token fingerprints
- [ ] Mobile responsive design functions on all pages
- [ ] No 500 errors in API logs
- [ ] No TypeError in browser console

**Script generated:** 2026-03-09
**Total additions:** 15 endpoints + 12 pages + 1 header update
