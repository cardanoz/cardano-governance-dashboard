#!/usr/bin/env python3
"""
Diagnose and fix dashboard API 500 errors.
Run on server: python3 fix-dashboard-apis.py
"""
import subprocess, sys, json, time, os

G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

API_FILE = "/home/ubuntu/adatool-api/src/index.js"
PROJECT = "/home/ubuntu/adatool-frontend"

def run(cmd, timeout=30):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

def psql(query, timeout=15):
    """Run a psql query and return output"""
    cmd = f'sudo -u postgres psql -d archive -t -A -c "{query}"'
    code, out, errs = run(cmd, timeout)
    return out.strip(), errs.strip()

# ============================================================
# Step 1: Diagnose - check what tables/columns exist
# ============================================================
print("\n" + "="*60)
info("DIAGNOSING DATABASE SCHEMA...")
print("="*60)

# Check key tables
tables_to_check = [
    "committee_member", "constitution", "delegation_vote", "drep_hash",
    "gov_action_proposal", "voting_procedure", "epoch_stake",
    "ada_pots", "reward", "script", "redeemer", "epoch_param"
]

for t in tables_to_check:
    out, _ = psql(f"SELECT COUNT(*) FROM {t}")
    if out and out.isdigit():
        log(f"  {t}: {int(out):,} rows")
    else:
        warn(f"  {t}: {out or 'NOT FOUND'}")

# Check committee_member columns
info("\nChecking committee_member columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='committee_member' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  committee_member table not found or empty schema")

# Check constitution columns
info("Checking constitution columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='constitution' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  constitution table not found")

# Check voting_procedure columns
info("Checking voting_procedure columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='voting_procedure' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  voting_procedure table not found")

# Check gov_action_proposal columns
info("Checking gov_action_proposal columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='gov_action_proposal' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  gov_action_proposal table not found")

# Check drep_hash columns
info("Checking drep_hash columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='drep_hash' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  drep_hash table not found")

# Check delegation_vote columns
info("Checking delegation_vote columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='delegation_vote' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  delegation_vote table not found")

# Check ada_pots columns
info("Checking ada_pots columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='ada_pots' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  ada_pots table not found")

# Check reward columns
info("Checking reward columns...")
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='reward' ORDER BY ordinal_position")
if out:
    log(f"  Columns: {out.replace(chr(10), ', ')}")
else:
    warn("  reward table not found")

# ============================================================
# Step 2: Test individual queries
# ============================================================
print("\n" + "="*60)
info("TESTING INDIVIDUAL QUERIES...")
print("="*60)

# Test holder epoch query
info("Testing holder epoch query...")
out, errs = psql("SELECT e.no, e.start_time, e.end_time FROM epoch e ORDER BY e.no DESC LIMIT 1")
if out:
    log(f"  Epoch: {out}")
else:
    warn(f"  Error: {errs[:200]}")

# Test CC members query
info("Testing CC members query...")
out, errs = psql("SELECT COUNT(*) FROM committee_member")
if out:
    log(f"  CC members count: {out}")
else:
    warn(f"  Error: {errs[:200]}")

# Test CC member columns more carefully
info("Testing CC member select...")
out, errs = psql("SELECT * FROM committee_member LIMIT 1")
if out:
    log(f"  CC member sample: {out[:200]}")
else:
    warn(f"  Error: {errs[:200]}")

# Test voting_procedure with voter_role
info("Testing voter_role values...")
out, errs = psql("SELECT DISTINCT voter_role FROM voting_procedure LIMIT 10")
if out:
    log(f"  Voter roles: {out.replace(chr(10), ', ')}")
else:
    warn(f"  Error: {errs[:200]}")

# Test gov_action_proposal
info("Testing gov_action_proposal select...")
out, errs = psql("SELECT type, COUNT(*) FROM gov_action_proposal GROUP BY type LIMIT 10")
if out:
    log(f"  Proposal types: {out[:300]}")
else:
    warn(f"  Error: {errs[:200]}")

# Test the actual API error
info("\nTesting actual API endpoints for error messages...")
endpoints = [
    "dashboard/holder",
    "dashboard/cc",
    "dashboard/drep",
    "dashboard/governance-analyst",
    "dashboard/chain-analyst",
    "dashboard/developer",
]
for ep in endpoints:
    code, out, _ = run(f"curl -s http://localhost:3001/{ep} --max-time 15")
    if out:
        # Try to parse JSON for error
        try:
            d = json.loads(out)
            if "error" in str(d).lower() or "message" in str(d).lower():
                warn(f"  /{ep}: {out[:300]}")
            else:
                log(f"  /{ep}: OK (keys: {list(d.keys()) if isinstance(d, dict) else 'array'})")
        except:
            warn(f"  /{ep}: {out[:300]}")
    else:
        warn(f"  /{ep}: empty/timeout")

print("\n" + "="*60)
info("DIAGNOSIS COMPLETE")
print("="*60)
print("\nPlease share the output above so I can create the targeted fixes.")
