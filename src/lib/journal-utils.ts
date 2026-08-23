// Helper functions for safe LEGER_OS AI Journal & Memories handling

export interface MemoryItem {
  id: string;
  content: string;
  category: string;
  categoryId?: number | string | null;
  createdAt: string;
  expiresAt: string | null;
  status: "active" | "expired" | string;
}

/**
 * Safely normalizes mixed string/object/array journal entries from Supabase JSONB
 * into a clean, typed array of MemoryItem objects sorted by recency.
 * Never throws "g is not iterable" errors regardless of input format.
 */
export function normalizeJournal(journal: any): MemoryItem[] {
  let list: any[] = [];

  if (Array.isArray(journal)) {
    list = journal;
  } else if (journal && typeof journal === "object") {
    if (Array.isArray(journal.memories)) {
      list = journal.memories;
    } else {
      const knownMetaKeys = ["retention_discount_claimed_at", "churn_survey", "pro_data_retention_deadline", "memories"];
      const candidates = Object.entries(journal)
        .filter(([key]) => !knownMetaKeys.includes(key))
        .map(([_, val]) => val);
      list = candidates.filter(val => typeof val === "string" || (val && typeof val === "object" && ("content" in (val as Record<string, any>) || "id" in (val as Record<string, any>))));
    }
  } else if (typeof journal === "string") {
    try {
      const parsed = JSON.parse(journal);
      return normalizeJournal(parsed);
    } catch {
      list = [];
    }
  }

  const now = new Date();
  return list
    .map((item: any, idx: number): MemoryItem => {
      if (typeof item === "string") {
        return {
          id: `legacy-${idx}`,
          content: item,
          category: "other",
          categoryId: null,
          createdAt: new Date().toISOString(),
          expiresAt: null,
          status: "active"
        };
      }

      if (!item || typeof item !== "object") {
        return {
          id: `mem-${idx}`,
          content: String(item || ""),
          category: "other",
          categoryId: null,
          createdAt: new Date().toISOString(),
          expiresAt: null,
          status: "active"
        };
      }

      let status = item.status || "active";
      if (item.expiresAt && new Date(item.expiresAt) < now) {
        status = "expired";
      }

      return {
        id: String(item.id || `mem-${idx}`),
        content: String(item.content || ""),
        category: String(item.category || "other"),
        categoryId: item.categoryId || null,
        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
        expiresAt: item.expiresAt ? String(item.expiresAt) : null,
        status: status
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Builds the updated ai_journal object or array to save back to Supabase,
 * preserving any subscription metadata keys if stored in object format.
 */
export function buildUpdatedJournal(rawJournal: any, newMemoriesList: MemoryItem[]): any {
  if (rawJournal && !Array.isArray(rawJournal) && typeof rawJournal === "object") {
    return {
      ...rawJournal,
      memories: newMemoriesList
    };
  }
  return newMemoriesList;
}

/**
 * Safely updates subscription metadata in ai_journal while preserving memories.
 */
export function buildSubscriptionUpdatedJournal(rawJournal: any, metadataUpdates: Record<string, any>): any {
  const existingMemories = normalizeJournal(rawJournal);
  const baseObject = (rawJournal && !Array.isArray(rawJournal) && typeof rawJournal === "object") ? rawJournal : {};
  return {
    ...baseObject,
    memories: existingMemories,
    ...metadataUpdates
  };
}
