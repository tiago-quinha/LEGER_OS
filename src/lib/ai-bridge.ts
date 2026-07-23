import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIBridgeOptions {
  provider?: string;
  customKey?: string;
  jsonMode?: boolean;
  modelType?: "pro" | "flash";
}

export async function generateAIContent(prompt: string, options: AIBridgeOptions = {}): Promise<string> {
  const provider = (options.provider || "gemini").toLowerCase();
  const customKey = (options.customKey || "").trim();

  // 1. GOOGLE GEMINI (Default & Free Tier Pro)
  if (provider === "gemini") {
    const rawApiKey = customKey || process.env.GOOGLE_GEMINI_API_KEY || "";
    const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
    if (!cleanApiKey) {
      throw new Error("Gemini API key is missing. Configure it in settings or .env");
    }
    const genAI = new GoogleGenerativeAI(cleanApiKey);
    const modelName = options.modelType === "flash" ? "gemini-2.5-flash" : (process.env.GEMINI_MODEL || "gemini-2.5-pro");
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: options.jsonMode ? { responseMimeType: "application/json" } : undefined
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim().replace(/```json|```/g, "");
  }

  // 2. OPENAI (GPT-4o / GPT-4o-mini)
  if (provider === "openai") {
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
    const content = data.choices?.[0]?.message?.content || "";
    return content.trim().replace(/```json|```/g, "");
  }

  // 3. GROQ (Llama 3.3 70B Fast)
  if (provider === "groq") {
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
    const content = data.choices?.[0]?.message?.content || "";
    return content.trim().replace(/```json|```/g, "");
  }

  // 4. OLLAMA (Local Server / Self-Hosted LLM)
  if (provider === "ollama") {
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
    const content = data.response || "";
    return content.trim().replace(/```json|```/g, "");
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
