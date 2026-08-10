import os
import json
import urllib.request
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
gemini_key = os.environ.get("GOOGLE_GEMINI_API_KEY", "").strip()

if not supabase_url or not service_role_key:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(supabase_url, service_role_key)

def call_gemini(prompt: str) -> str:
    if not gemini_key:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = json.loads(resp.read().decode("utf-8"))
            text = res_body["candidates"][0]["content"]["parts"][0]["text"]
            return text
    except Exception as e:
        print(f"Gemini API Call Error: {e}")
        return ""

def recategorize_memories():
    print("--- FETCHING PROFILES FROM SUPABASE ---")
    profiles_res = supabase.from_("profiles").select("id, ai_journal").execute()
    profiles = profiles_res.data or []

    categories_res = supabase.from_("categories").select("id, name, user_id").execute()
    categories_all = categories_res.data or []

    total_updated = 0

    for profile in profiles:
        user_id = profile["id"]
        raw_journal = profile.get("ai_journal")
        if not raw_journal:
            continue

        # Get categories for this user (or fallback to all categories)
        user_categories = [c for c in categories_all if c.get("user_id") == user_id]
        if not user_categories:
            user_categories = categories_all

        cat_names = [c["name"] for c in user_categories]
        cat_str = ", ".join(cat_names) if cat_names else "General Expenses"

        memories = []
        is_obj_format = False

        if isinstance(raw_journal, list):
            memories = raw_journal
        elif isinstance(raw_journal, dict):
            is_obj_format = True
            memories = raw_journal.get("memories", [])
        elif isinstance(raw_journal, str):
            try:
                parsed = json.loads(raw_journal)
                if isinstance(parsed, list):
                    memories = parsed
                elif isinstance(parsed, dict):
                    is_obj_format = True
                    memories = parsed.get("memories", [])
            except Exception:
                memories = []

        if not memories:
            continue

        modified = False
        new_memories = []

        for mem in memories:
            if isinstance(mem, str):
                mem_obj = {
                    "id": f"mem_migrated_{len(new_memories)}",
                    "content": mem,
                    "category": "Other",
                    "createdAt": "2026-08-01T00:00:00.000Z",
                    "expiresAt": None,
                    "status": "active"
                }
            else:
                mem_obj = dict(mem)

            current_cat = str(mem_obj.get("category", "")).lower()
            content = mem_obj.get("content", "")

            # If category is "lifestyle", "other", or invalid, re-classify using Gemini / matching
            if current_cat in ["lifestyle", "other", ""] or not current_cat:
                matched_cat = None
                matched_id = None

                # Try simple keyword matching first
                for c in user_categories:
                    if c["name"].lower() in content.lower():
                        matched_cat = c["name"]
                        matched_id = c["id"]
                        break

                # If no direct keyword match and Gemini is available, query Gemini
                if not matched_cat and content:
                    prompt = f"""
                    Given the following user financial memory statement: "{content}"
                    Select the single best matching category from this list of user financial categories: [{cat_str}].
                    If it does not fit any expense category, assign one of: "Goal", "Health Condition", "Financial", "Other".
                    Return strictly a JSON object: {{"category": "string"}}
                    """
                    res_text = call_gemini(prompt)
                    if "{" in res_text:
                        try:
                            start = res_text.find("{")
                            end = res_text.rfind("}")
                            res_json = json.loads(res_text[start:end+1])
                            cat_candidate = res_json.get("category", "").strip()
                            if cat_candidate:
                                matched_cat = cat_candidate
                                for c in user_categories:
                                    if c["name"].lower() == matched_cat.lower():
                                        matched_id = c["id"]
                                        matched_cat = c["name"]
                                        break
                        except Exception as e:
                            print(f"Parsing response failed: {e}")

                if not matched_cat or matched_cat.lower() == "lifestyle":
                    matched_cat = "Other"

                print(f"Re-classified memory: '{content}' -> Old: '{mem_obj.get('category')}' | New: '{matched_cat}'")
                mem_obj["category"] = matched_cat
                if matched_id:
                    mem_obj["categoryId"] = matched_id
                modified = True

            new_memories.append(mem_obj)

        if modified:
            if is_obj_format and isinstance(raw_journal, dict):
                raw_journal["memories"] = new_memories
                updated_journal = raw_journal
            else:
                updated_journal = new_memories

            supabase.from_("profiles").update({"ai_journal": updated_journal}).eq("id", user_id).execute()
            total_updated += 1
            print(f"Successfully updated ai_journal for profile {user_id}")

    print(f"--- RE-CLASSIFICATION COMPLETE. Updated {total_updated} profile(s). ---")

if __name__ == "__main__":
    recategorize_memories()
