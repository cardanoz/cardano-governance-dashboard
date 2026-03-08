#!/bin/bash
# Fix Phase 4 pages: change revalidate to force-dynamic
# Fix Charts: reduce default days from 30 to 7
set -e
cd /home/ubuntu/adatool-frontend

echo "=== Fixing Protocol page ==="
sed -i 's/export const revalidate = 300;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/protocol/page.tsx"
sed -i 's/{ next: { revalidate: 300 } }/{ cache: "no-store" }/g' "src/app/(explorer)/protocol/page.tsx"

echo "=== Fixing Stake Distribution page ==="
sed -i 's/export const revalidate = 600;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/stake-distribution/page.tsx"
sed -i 's/{ next: { revalidate: 600 } }/{ cache: "no-store" }/g' "src/app/(explorer)/stake-distribution/page.tsx"

echo "=== Fixing Committee page ==="
sed -i 's/export const revalidate = 300;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/committee/page.tsx"
sed -i 's/{ next: { revalidate: 300 } }/{ cache: "no-store" }/g' "src/app/(explorer)/committee/page.tsx"

echo "=== Fixing Charts page (reduce 30 days to 7) ==="
sed -i 's|/tx-volume?days=30|/tx-volume?days=7|' "src/app/(explorer)/charts/page.tsx"
sed -i 's/{ next: { revalidate: 300 } }/{ cache: "no-store" }/g' "src/app/(explorer)/charts/page.tsx"

echo "=== Fixing remaining revalidate in Phase 3 pages ==="
# Asset holders page
if grep -q 'export const revalidate' "src/app/(explorer)/asset/[fingerprint]/holders/page.tsx" 2>/dev/null; then
  sed -i 's/export const revalidate = [0-9]*;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/asset/[fingerprint]/holders/page.tsx"
  sed -i 's/{ next: { revalidate: [0-9]* } }/{ cache: "no-store" }/g' "src/app/(explorer)/asset/[fingerprint]/holders/page.tsx"
fi

# Pool blocks page
if grep -q 'export const revalidate' "src/app/(explorer)/pool/[id]/blocks/page.tsx" 2>/dev/null; then
  sed -i 's/export const revalidate = [0-9]*;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/pool/[id]/blocks/page.tsx"
  sed -i 's/{ next: { revalidate: [0-9]* } }/{ cache: "no-store" }/g' "src/app/(explorer)/pool/[id]/blocks/page.tsx"
fi

# Dashboard page
if grep -q 'export const revalidate' "src/app/(explorer)/page.tsx" 2>/dev/null; then
  sed -i 's/export const revalidate = [0-9]*;/export const dynamic = "force-dynamic";/' "src/app/(explorer)/page.tsx"
  sed -i 's/{ next: { revalidate: [0-9]* } }/{ cache: "no-store" }/g' "src/app/(explorer)/page.tsx"
fi

# Catch any remaining revalidate exports in explorer pages
find src/app/\(explorer\) -name "page.tsx" -exec grep -l 'export const revalidate' {} \; | while read f; do
  echo "  Fixing remaining: $f"
  sed -i 's/export const revalidate = [0-9]*;/export const dynamic = "force-dynamic";/' "$f"
  sed -i 's/{ next: { revalidate: [0-9]* } }/{ cache: "no-store" }/g' "$f"
done

echo "=== Verifying changes ==="
echo "--- Pages with force-dynamic ---"
grep -rn 'force-dynamic' src/app/\(explorer\)/protocol/page.tsx src/app/\(explorer\)/committee/page.tsx src/app/\(explorer\)/stake-distribution/page.tsx src/app/\(explorer\)/charts/page.tsx 2>/dev/null || echo "  (none found - check manually)"
echo "--- Any remaining revalidate ---"
grep -rn 'export const revalidate' src/app/\(explorer\)/ 2>/dev/null || echo "  None - all converted!"
echo "--- Charts days ---"
grep -n 'tx-volume' src/app/\(explorer\)/charts/page.tsx 2>/dev/null

echo ""
echo "=== Building frontend ==="
npm run build

echo "=== Deploying ==="
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "=== Restarting frontend ==="
sudo systemctl restart adatool-frontend
sleep 3
echo "=== Frontend status ==="
sudo systemctl status adatool-frontend --no-pager | head -15

echo ""
echo "=== Done! Testing endpoints ==="
sleep 2
for path in protocol committee stake-distribution charts; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$path" --max-time 15)
  echo "  /$path => $status"
done
