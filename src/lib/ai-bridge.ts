import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIBridgeOptions {
  provider?: string;
  customKey?: string;
  jsonMode?: boolean;
  modelType?: "pro" | "flash";
}

// Robust JSON extraction helper to isolate JSON structures from markdown wrappers or conversational fluff
function extractJSON(str: string): string {
  const trimmed = str.trim();
  
  // Find the first occurrence of '{' (object) or '[' (array)
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let startIdx = -1;
  let endChar = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }

  if (startIdx !== -1) {
    const lastIdx = trimmed.lastIndexOf(endChar);
    if (lastIdx !== -1 && lastIdx > startIdx) {
      return trimmed.substring(startIdx, lastIdx + 1);
    }
  }
  
  // Fallback cleanup if structural markers are not cleanly matched
  return trimmed.replace(/```[a-zA-Z]*|```/g, "").trim();
}

export async function generateAIContent(prompt: string, options: AIBridgeOptions = {}): Promise<string> {
  const provider = (options.provider || "gemini").toLowerCase();
  const customKey = (options.customKey || "").trim();
  let rawContent = "";

  // 1. GOOGLE GEMINI (Default & Free Tier Pro)
  if (provider === "gemini") {
    const rawApiKey = customKey || process.env.GOOGLE_GEMINI_API_KEY || "";
    const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
    if (!cleanApiKey) {
      throw new Error("Gemini API key is missing. Configure it in settings or .env");
    }
    const genAI = new GoogleGenerativeAI(cleanApiKey);
    const preferredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const candidateModels = Array.from(new Set([preferredModel, "gemini-2.5-flash", "gemini-2.5-pro"]));
    
    let lastError: any = null;
    let success = false;
    for (const mName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: mName,
          generationConfig: options.jsonMode ? { responseMimeType: "application/json" } : undefined
        });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        rawContent = response.text();
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${mName} failed, trying fallback...`, err?.message || err);
      }
    }
    if (!success) {
      throw lastError || new Error("Failed to generate content with Gemini API.");
    }
  }

  // 2. OPENAI (GPT-4o / GPT-4o-mini)
  else if (provider === "openai") {
    const apiKey = customKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      throw new Error("OpenAI API key is required when using the OpenAI provider.");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
        temperature: 0.2
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${err}`);
    }
    const data = await res.json();
    rawContent = data.choices?.[0]?.message?.content || "";
  }

  // 3. GROQ (Llama 3.3 70B Fast)
  else if (provider === "groq") {
    const apiKey = customKey || process.env.GROQ_API_KEY || "";
    if (!apiKey) {
      throw new Error("Groq API key is required when using the Groq provider.");
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error: ${res.status} ${err}`);
    }
    const data = await res.json();
    rawContent = data.choices?.[0]?.message?.content || "";
  }

  // 4. OLLAMA (Local Server / Self-Hosted LLM)
  else if (provider === "ollama") {
    const endpoint = customKey || "http://localhost:11434";
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1",
        prompt: prompt,
        stream: false,
        format: options.jsonMode ? "json" : undefined
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama server error (${endpoint}): ${res.status} ${err}`);
    }
    const data = await res.json();
    rawContent = data.response || "";
  }

  else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // Apply robust post-processing JSON cleaning if jsonMode is requested
  return options.jsonMode ? extractJSON(rawContent) : rawContent.trim();
}
