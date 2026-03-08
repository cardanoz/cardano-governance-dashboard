#!/bin/bash
# Fix build errors: duplicate functions in format.ts + import issues
set -e
cd /home/ubuntu/adatool-frontend

echo "=== Step 1: Fix format.ts (remove duplicate functions) ==="
cat > src/lib/format.ts << 'FORMATEOF'
export function lovelaceToAda(lovelace: string | number, decimals = 2): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function truncHash(hash: string, len = 8): string {
  if (!hash || hash.length <= len * 2) return hash || "";
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function compactNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

export function fmtAda(lovelace: string | number): string {
  const n = Number(lovelace) / 1000000;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}
FORMATEOF
echo "  format.ts written (clean, no duplicates)"

echo ""
echo "=== Step 2: Fix import errors ==="

# Fix epoch/[no]/page.tsx - change { api } to { fetchAPI }
if [ -f "src/app/(explorer)/epoch/[no]/page.tsx" ]; then
  sed -i 's/import { api }/import { fetchAPI }/g' "src/app/(explorer)/epoch/[no]/page.tsx"
  sed -i 's/await api(/await fetchAPI(/g' "src/app/(explorer)/epoch/[no]/page.tsx"
  echo "  Fixed epoch/[no]/page.tsx imports"
fi

# Fix search page if it references api instead of fetchAPI
if [ -f "src/app/(explorer)/search/page.tsx" ]; then
  sed -i 's/import { api }/import { fetchAPI }/g' "src/app/(explorer)/search/page.tsx"
  sed -i 's/await api(/await fetchAPI(/g' "src/app/(explorer)/search/page.tsx"
  echo "  Fixed search/page.tsx imports"
fi

# Scan for any remaining { api } imports from @/lib/api
echo ""
echo "=== Step 3: Scan for any remaining wrong imports ==="
grep -rn "import.*{ api }.*from.*@/lib/api" src/app/ 2>/dev/null && echo "  ^ These need fixing!" || echo "  No remaining { api } imports - good!"

# Check for any pages importing from wrong paths
grep -rn "from ['\"]@/lib/format['\"]" src/app/ 2>/dev/null | head -5
echo ""

# Remove any stale route directories outside (explorer) group
echo "=== Step 4: Remove duplicate routes ==="
for dir in blocks txs search; do
  if [ -d "src/app/$dir" ]; then
    rm -rf "src/app/$dir"
    echo "  Removed duplicate src/app/$dir"
  fi
done

echo ""
echo "=== Step 5: Verify format.ts ==="
echo "  Functions exported:"
grep "^export function" src/lib/format.ts
echo ""

echo "=== Step 6: Building frontend ==="
npm run build 2>&1 | tail -30

echo ""
echo "=== Step 7: Deploying ==="
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
sudo systemctl restart adatool-frontend
sleep 3
echo "Frontend status: $(sudo systemctl is-active adatool-frontend)"

echo ""
echo "=== Step 8: Quick page tests ==="
sleep 2
for path in "" blocks txs epochs pools governance dreps committee protocol stake-distribution whales richlist charts \
            votes drep-delegations constitution treasury tx-metadata contract-txs rewards-withdrawals \
            delegations pools/new pools/retired pool-updates certificates rewards-checker \
            analytics/pots analytics/treasury-projection analytics/top-addresses analytics/top-stakers \
            analytics/wealth analytics/block-versions analytics/genesis analytics/tx-charts; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$path" --max-time 15 2>/dev/null || echo "TIMEOUT")
  label="/$path"
  [ -z "$path" ] && label="/ (dashboard)"
  echo "  $label => $status"
done

echo ""
echo "=== Done! ==="
