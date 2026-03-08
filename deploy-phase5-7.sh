#!/bin/bash
# Deploy Phase 5-7: API + Frontend
set -e

echo "========================================="
echo " Phase 5-7 Deploy: 22 new API endpoints"
echo "         + 21 new pages + dropdown nav"
echo "========================================="

# Step 1: Download and deploy API
echo ""
echo "=== Step 1: Deploying API ==="
cd /home/ubuntu/adatool-api/src
curl -sL "https://raw.githubusercontent.com/cardanoz/cardano-governance-dashboard/main/adatool-api-index.js" -o index.js
echo "  API downloaded ($(wc -l < index.js) lines)"
sudo systemctl restart adatool-api
sleep 2
echo "  API status: $(sudo systemctl is-active adatool-api)"

# Quick API health check
echo ""
echo "=== Step 2: Testing new API endpoints ==="
for ep in votes drep-delegations constitution treasury-withdrawals tx-metadata contract-txs rewards-withdrawals \
           delegations/live pools/new pools/retired pool-updates certificates \
           pots treasury-projection top-addresses top-stakers wealth-composition block-versions genesis-addresses "tx-charts?metric=daily-count&days=7"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/$ep" --max-time 15 2>/dev/null || echo "TIMEOUT")
  echo "  /$ep => $status"
done

# Step 3: Run frontend setup
echo ""
echo "=== Step 3: Setting up frontend pages ==="
cd /home/ubuntu/adatool-frontend
curl -sL "https://raw.githubusercontent.com/cardanoz/cardano-governance-dashboard/main/setup-frontend-phase5-7.sh" -o /tmp/setup-frontend-phase5-7.sh
bash /tmp/setup-frontend-phase5-7.sh

# Step 4: Build frontend
echo ""
echo "=== Step 4: Building frontend ==="
npm run build

echo "=== Step 5: Deploying frontend ==="
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
sudo systemctl restart adatool-frontend
sleep 3

echo ""
echo "=== Step 6: Testing frontend pages ==="
for path in votes drep-delegations constitution treasury tx-metadata contract-txs rewards-withdrawals \
            delegations pools/new pools/retired pool-updates certificates rewards-checker \
            analytics/pots analytics/treasury-projection analytics/top-addresses analytics/top-stakers \
            analytics/wealth analytics/block-versions analytics/genesis analytics/tx-charts; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$path" --max-time 15 2>/dev/null || echo "TIMEOUT")
  echo "  /$path => $status"
done

echo ""
echo "========================================="
echo " Phase 5-7 deployment complete!"
echo " Total endpoints: ~53"
echo " Total pages: ~50"
echo "========================================="
