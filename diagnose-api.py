#!/usr/bin/env python3
"""
Diagnose API issues - check if API is running, check for syntax errors.
Run on server: python3 diagnose-api.py
"""
import subprocess, json, sys

def run(cmd, timeout=15):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

G = "\033[32m"; R = "\033[31m"; C = "\033[36m"; Y = "\033[33m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

API_FILE = "/home/ubuntu/adatool-api/src/index.js"

# 1. Check if API service is running
info("Checking API service status...")
code, out, _ = run("sudo systemctl is-active adatool-api")
print(f"  Status: {out.strip()}")

code, out, _ = run("sudo systemctl status adatool-api 2>&1 | tail -20")
print(f"  Details:\n{out}")

# 2. Check API logs for errors
info("Checking API logs...")
code, out, _ = run("sudo journalctl -u adatool-api --no-pager -n 40 2>&1")
print("  Recent logs:")
for line in out.split("\n")[-30:]:
    if "error" in line.lower() or "Error" in line or "SyntaxError" in line or "Cannot" in line or "failed" in line.lower():
        err(f"  {line.strip()}")
    elif line.strip():
        print(f"  {line.strip()}")

# 3. Try to syntax-check the API file with node
info("Syntax checking API file...")
code, out, errs = run(f"node --check {API_FILE} 2>&1")
if code == 0:
    log("  Syntax OK")
else:
    err(f"  Syntax error: {out} {errs}")

# 4. Check if backup exists and compare sizes
info("Checking file sizes...")
code, out, _ = run(f"wc -l {API_FILE} {API_FILE}.bak 2>/dev/null")
print(f"  {out.strip()}")

# 5. Check if port 3001 is listening
info("Checking port 3001...")
code, out, _ = run("sudo ss -tlnp | grep 3001")
if out.strip():
    log(f"  Port 3001: {out.strip()}")
else:
    err("  Port 3001 NOT listening!")

# 6. Try a simple curl
info("Testing basic API...")
code, out, _ = run("curl -s http://localhost:3001/ --max-time 5")
print(f"  Response: {(out or 'empty')[:200]}")

# 7. If API is broken, restore from backup
code, out, _ = run("sudo systemctl is-active adatool-api")
if out.strip() != "active":
    warn("API is not active! Attempting restore from backup...")
    code, _, _ = run(f"cp {API_FILE}.bak {API_FILE}")
    if code == 0:
        log("  Restored from backup")
        run("sudo systemctl restart adatool-api")
        import time; time.sleep(5)
        code, out, _ = run("sudo systemctl is-active adatool-api")
        if out.strip() == "active":
            log("  API restored and running!")
        else:
            err("  API still not running after restore")
            code, out, _ = run("sudo journalctl -u adatool-api --no-pager -n 10 2>&1")
            print(out)

print("\n" + "="*60)
info("DIAGNOSIS COMPLETE")
print("="*60)
