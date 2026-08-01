import os
import time
import subprocess

WATCH_DIR = os.path.dirname(__file__)

print("--- LEGER_OS Vault File Watcher & Auto-Sync Engine ---")
print(f"Monitoring workspace: {WATCH_DIR}")
print("Watching for statement drops (*.txt, *.pdf)...")

seen_files = set(os.listdir(WATCH_DIR))

def trigger_sync():
    print("\n[EVENT] New statement file detected! Triggering auto-ingestion & vault update...")
    try:
        subprocess.run(["python", "import_transactions.py"], check=True)
        subprocess.run(["python", "audit_balances.py"], check=True)
        subprocess.run(["python", "build_full_vault.py"], check=True)
        print("[SUCCESS] Vault & Supabase successfully synchronized!")
    except Exception as e:
        print(f"[ERROR] Sync failed: {e}")

if __name__ == "__main__":
    try:
        while True:
            time.sleep(3)
            current_files = set(os.listdir(WATCH_DIR))
            new_files = current_files - seen_files
            
            for f in new_files:
                if f.endswith(".txt") or f.endswith(".pdf"):
                    if "extracto" in f.lower() or "transaction" in f.lower() or "movimento" in f.lower():
                        print(f"\n[DETECTED] New statement file: {f}")
                        trigger_sync()
                        break
            seen_files = current_files
    except KeyboardInterrupt:
        print("\nWatcher stopped by user.")
