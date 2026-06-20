import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
const genAI = new GoogleGenerativeAI(cleanApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentBalance, categories, velocity, userName } = body;

    const name = userName || "User";

    const prompt = `
      You are the LEGER_OS AI, a high-precision strategic wealth agent for ${name}.
      Speak directly to ${name}. Be helpful, concise, and clear. 

      TYPOGRAPHY RULES:
      - Use Proper Sentence Case (e.g., "${name}, your balance is...")
      - NEVER USE ALL-CAPS FOR THE MESSAGE. It is difficult to read.
      - Use bold text for numbers or category names for emphasis.

      DATA FOR ANALYSIS:
      - ${name}'s Balance: €${currentBalance.toFixed(2)}
      - Spending Speed (Velocity): ${velocity.toFixed(2)}x (1.0 is perfect, above 1.0 means spending faster than income)
      - Top Spend Categories: ${categories.map((c: any) => `${c.name}: €${c.value.toFixed(2)}`).join(", ")}

      YOUR TASK:
      1. Tell ${name} exactly how the cycle is going in simple terms.
      2. Point out ONE specific category that needs attention if velocity is high.
      3. Give one practical, "human" piece of advice.
      4. Address ${name} by name.

      Format your response as a JSON object:
      {
        "status": "HEALTHY" | "WATCHING" | "ALERT",
        "message": "Start with '${name}, ...'. A clear, readable summary.",
        "threatLevel": 0-100
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().replace(/```json|```/g, "");
    
    try {
        return NextResponse.json(JSON.parse(text));
    } catch (parseError) {
        console.error("Leger AI JSON Parse Error:", text);
        return NextResponse.json({ error: "Leger AI is having trouble formatting its thoughts." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini/Leger Error:", error);
    
    if (error.status === 429 || error.message?.includes("429")) {
        return NextResponse.json({ error: "Processing limit reached. Let's try again in a few minutes." }, { status: 429 });
    }
    
    return NextResponse.json({ error: error.message || "Mainframe connection lost." }, { status: 500 });
  }
}
