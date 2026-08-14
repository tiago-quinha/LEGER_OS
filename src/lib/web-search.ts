/**
 * LEGER_OS Live Financial Web Search Engine
 * Provides real-time external macro grounding (interest rates, inflation, merchant pricing, earnings).
 */

export interface WebSearchResultItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResultItem[];
  groundedSummary: string;
}

export async function searchFinancialWeb(query: string): Promise<WebSearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { query: "", results: [], groundedSummary: "" };
  }

  const results: WebSearchResultItem[] = [];

  try {
    // 1. DuckDuckGo Instant Answers & Lite HTML Scraper (Fast, Free, No API keys required)
    const encoded = encodeURIComponent(cleanQuery);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt;q=0.8"
      },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });

    if (res.ok) {
      const html = await res.text();

      // Extract result-snippet and result-title matches with regex
      const resultBlocks = html.split(/<div class="result results_links/gi);

      for (let i = 1; i < Math.min(resultBlocks.length, 6); i++) {
        const block = resultBlocks[i];

        // Title and URL
        const titleMatch = block.match(/<a class="result__snippet[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/<h2 class="result__title">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);

        // Snippet
        const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/i) ||
                             block.match(/<div class="result__snippet[^>]*>([\s\S]*?)<\/div>/i);

        if (titleMatch && snippetMatch) {
          const rawUrl = titleMatch[1];
          // Unwrap DuckDuckGo redirect URL
          let finalUrl = rawUrl;
          try {
            const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
            if (uddgMatch) {
              finalUrl = decodeURIComponent(uddgMatch[1]);
            }
          } catch {
            finalUrl = rawUrl;
          }

          const cleanTitle = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim();
          const cleanSnippet = snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim();

          if (cleanSnippet.length > 20) {
            let domain = "";
            try {
              domain = new URL(finalUrl).hostname.replace(/^www\./, "");
            } catch {
              domain = "Web";
            }

            results.push({
              title: cleanTitle || "Financial Source",
              snippet: cleanSnippet,
              url: finalUrl,
              source: domain
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Web Search Grounding failed:", err);
  }

  // Generate clean grounding summary string for AI context injection
  let groundedSummary = "";
  if (results.length > 0) {
    groundedSummary = "LIVE EXTERNAL WEB SEARCH RESULTS (REAL-TIME GROUNDING):\n" +
      results
        .map((r, idx) => `[${idx + 1}] "${r.title}" (${r.source})\nSnippet: ${r.snippet}\nSource URL: ${r.url}`)
        .join("\n\n");
  } else {
    groundedSummary = `Live web search for "${cleanQuery}" returned no immediate snippets.`;
  }

  return {
    query: cleanQuery,
    results,
    groundedSummary
  };
}
