"""
Full Memory Recategorization & Projection Override Migration Script (v2)
-------------------------------------------------------------------------
Correctly handles mixed object/array structures in ai_journal (including "0" keys)
and generates matching projection_overrides.
"""
import os, sys, json, time, random, string, re
from dotenv import load_dotenv
from supabase import create_client

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

profiles = sb.table("profiles").select("id, ai_journal, projection_overrides").execute().data

def parse_override_from_text(content, cat_name):
    text = content.lower()
    
    # 1. Percentage reduction
    pct_match = re.search(r'(\d+)\s*%\s*(?:less|lower|reduction|decrease|cut|off|fewer)', text)
    if not pct_match:
        pct_match = re.search(r'(?:reduce|cut|lower|decrease)\s*.*?\s*by\s*(\d+)\s*%', text)
    if pct_match:
        pct = float(pct_match.group(1))
        mult = max(0.0, 1.0 - (pct / 100.0))
        return {"multiplier": mult, "reason": f"{int(pct)}% lower {cat_name} spend"}

    # 2. Percentage increase
    pct_inc = re.search(r'(\d+)\s*%\s*(?:more|higher|increase|extra)', text)
    if pct_inc:
        pct = float(pct_inc.group(1))
        mult = 1.0 + (pct / 100.0)
        return {"multiplier": mult, "reason": f"{int(pct)}% higher {cat_name} spend"}

    # 3. Freeze / zero
    if re.search(r'\b(?:no more|stop|zero|freeze|eliminate|cancel)\b', text):
        return {"multiplier": 0.0, "reason": f"Frozen {cat_name} spend"}

    # 4. Qualitative reduction (e.g. "less gas", "expecting less gas", "lower fuel")
    if re.search(r'\b(?:less|lower|reduced|smaller|cheaper|fewer|on holiday|on break|vacation)\b', text):
        return {"multiplier": 0.70, "reason": f"Lower spending on {cat_name}"}

    # 5. Qualitative increase
    if re.search(r'\b(?:more|higher|extra|increased|greater)\b', text):
        return {"multiplier": 1.30, "reason": f"Higher spending on {cat_name}"}

    # 6. Fixed delta
    fix_match = re.search(r'(?:saving|save|cut|reduce|less)\s*(?:€|\$|eur)?\s*(\d+)', text)
    if fix_match:
        amt = float(fix_match.group(1))
        return {"multiplier": 1.0, "fixedDelta": -amt, "reason": f"Save €{int(amt)} on {cat_name}"}

    return None

for prof in profiles:
    user_id = prof["id"]
    raw_j = prof.get("ai_journal")
    if not raw_j:
        continue

    # Fetch user categories
    cats = sb.table("categories").select("id, name").eq("user_id", user_id).execute().data or []
    cat_map_by_name = {c["name"].lower(): c for c in cats}

    # Normalize memories list properly
    memories_list = []
    if isinstance(raw_j, list):
        memories_list = raw_j
    elif isinstance(raw_j, dict):
        # Collect from memories key if non-empty
        if "memories" in raw_j and isinstance(raw_j["memories"], list):
            memories_list.extend(raw_j["memories"])
        # Also collect from top-level dict keys (like "0", "1")
        known_meta = ["retention_discount_claimed_at", "churn_survey", "pro_data_retention_deadline", "memories"]
        for k, v in raw_j.items():
            if k not in known_meta:
                if isinstance(v, dict) and ("content" in v or "id" in v):
                    # Check not duplicate of one in memories
                    v_id = v.get("id")
                    if not any(m.get("id") == v_id for m in memories_list if isinstance(m, dict)):
                        memories_list.append(v)
                elif isinstance(v, str):
                    memories_list.append({"id": f"mem_{k}", "content": v, "category": "other"})

    if not memories_list:
        continue

    print(f"\nProcessing user {user_id[:8]} with {len(memories_list)} memories...")

    existing_overrides = prof.get("projection_overrides") or []
    updated_memories = []
    new_overrides = []

    for mem in memories_list:
        if not isinstance(mem, dict):
            continue
        content = mem.get("content", "")
        curr_cat = mem.get("category", "other")
        curr_cat_id = mem.get("categoryId")
        mem_id = mem.get("id") or f"mem_{int(time.time())}"

        # Recategorize if category is generic ('lifestyle', 'other', etc.) or categoryId is missing
        target_cat = curr_cat
        target_cat_id = curr_cat_id

        # Scan text & category name for matching category
        content_lower = content.lower()
        for cat_name, cat_obj in cat_map_by_name.items():
            if cat_name in content_lower or cat_name in curr_cat.lower():
                target_cat = cat_obj["name"]
                target_cat_id = cat_obj["id"]
                break

        updated_mem = {
            **mem,
            "id": mem_id,
            "category": target_cat,
            "categoryId": target_cat_id
        }
        updated_memories.append(updated_mem)

        # Check if memory has quantifiable spending impact
        parsed = parse_override_from_text(content, target_cat)
        if parsed and target_cat_id:
            ov_id = f"ov_{int(time.time())}_{(''.join(random.choices(string.ascii_lowercase, k=4)))}"
            ov = {
                "id": ov_id,
                "memoryId": mem_id,
                "categoryId": str(target_cat_id),
                "categoryName": target_cat,
                "reason": parsed.get("reason", content),
                "multiplier": parsed.get("multiplier", 1.0)
            }
            if "fixedDelta" in parsed:
                ov["fixedDelta"] = parsed["fixedDelta"]
            
            new_overrides.append(ov)
            print(f"  ✓ Override created for memory [{mem_id[:12]}]: '{content}' -> {ov['reason']} (Category: {target_cat}, multiplier: {ov['multiplier']})")
        else:
            print(f"  · Memory [{mem_id[:12]}]: '{content}' -> No projection override needed")

    # Rebuild ai_journal structure in standard normalized format
    new_journal = raw_j
    if isinstance(raw_j, list):
        new_journal = updated_memories
    elif isinstance(raw_j, dict):
        base_meta = {k: v for k, v in raw_j.items() if k in ["retention_discount_claimed_at", "churn_survey", "pro_data_retention_deadline"]}
        new_journal = {
            **base_meta,
            "memories": updated_memories
        }

    # Merge overrides (replace any old memory-linked override for same categoryId or memoryId)
    new_mem_ids = {ov["memoryId"] for ov in new_overrides}
    merged_overrides = [ov for ov in existing_overrides if ov.get("memoryId") not in new_mem_ids]
    merged_overrides.extend(new_overrides)

    # Save back to Supabase
    sb.table("profiles").update({
        "ai_journal": new_journal,
        "projection_overrides": merged_overrides
    }).eq("id", user_id).execute()

    print(f"  ✅ Successfully updated user {user_id[:8]}: {len(updated_memories)} memories recategorized, {len(new_overrides)} projection overrides active.")

print("\nMigration completed successfully.")
