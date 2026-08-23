import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const { allowed, reason } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await request.json();
    const { currentBalance, categories, velocity, userName, totalIn, totalOut, spendingLimit } = body;

    const name = userName || "User";
    const netDelta = (totalIn || 0) - (totalOut || 0);

    const prompt = `
      You are the LEGER_OS AI, a high-precision strategic wealth agent for ${name}.
      Speak directly to ${name}. Be helpful, concise, and clear. 

      TYPOGRAPHY RULES:
      - Use Proper Sentence Case (e.g., "${name}, your balance is...")
      - NEVER USE ALL-CAPS FOR THE MESSAGE. It is difficult to read.
      - Use bold text for numbers or category names for emphasis (e.g., '**€120.00**', '**Food**').

      DATA FOR ANALYSIS:
      - Projected End-of-Cycle Cash Balance: €${currentBalance.toFixed(2)}
      - Spend Velocity: ${velocity.toFixed(2)}x (Ratio relative to their self-imposed budget. Above 1.0 means spending faster than their planned limit.)
      - Actual Inflow (Income): €${(totalIn || 0).toFixed(2)}
      - Actual Outflow (Spending): €${(totalOut || 0).toFixed(2)}
      - Self-Imposed Spending Limit (Budget): €${(spendingLimit || 0).toFixed(2)}
      - Net Cash Flow Surplus: €${netDelta.toFixed(2)} (A positive value means they are saving money this cycle)
      - Top Spend Categories: ${categories.map((c: any) => `${c.name}: €${c.value.toFixed(2)}`).join(", ")}

      YOUR TASK:
      1. Tell ${name} exactly how the cycle is going in simple terms.
      2. Point out ONE specific category that needs attention if velocity is high.
      3. Give one practical, "human" piece of advice.
      4. Address ${name} by name.

      Format your response as a JSON object:
      {
        "status": "HEALTHY" | "WATCHING" | "ALERT",
        "message": "Start with '${name}, ...'. A clear, readable 1-2 sentence summary of the cycle. Use markdown bolding (e.g. '**1.45x**', '**Food**') for emphasis on key numbers or categories.",
        "actionItem": "A single specific, tactical action item to improve velocity (e.g., 'Temporarily freeze **Entertainment** purchases for 5 days', 'Limit **Food** spending to **€20/day**'). Keep it under 15 words and use bolding.",
        "threatLevel": 0-100
      }
    `;

    const text = await generateAIContent(prompt, {
      provider: request.headers.get("x-ai-provider") || undefined,
      customKey: request.headers.get("x-custom-api-key") || undefined,
      jsonMode: true,
      modelType: "flash"
    });
    
    try {
        const aiJson = JSON.parse(text);
        
        // Calculate deterministic threatLevel to eliminate hallucinated slop
        let computedThreat = 0;
        const inflowVal = parseFloat(totalIn) || 0;
        const outflowVal = parseFloat(totalOut) || 0;
        const limitVal = parseFloat(spendingLimit) || 1500;
        const velVal = parseFloat(velocity) || 0;
        
        if (inflowVal > outflowVal) {
          // Net surplus: threat is low to moderate (0% to 45%)
          computedThreat = Math.round(Math.min(45, (outflowVal / Math.max(1, limitVal)) * 30));
        } else {
          // Net deficit: threat is high (50% to 100%)
          const deficitRatio = inflowVal > 0 ? ((outflowVal - inflowVal) / inflowVal) : 0.5;
          computedThreat = Math.round(50 + Math.min(50, deficitRatio * 100));
        }
        
        // Add velocity penalty if over budget
        if (velVal > 1.1) {
          computedThreat = Math.min(100, computedThreat + Math.round((velVal - 1.0) * 15));
        }
        
        aiJson.threatLevel = computedThreat;
        
        return NextResponse.json(aiJson);
    } catch (parseError) {
        console.error("Leger AI JSON Parse Error:", text);
        return NextResponse.json({ error: "Leger AI is having trouble formatting its thoughts." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini/Leger Error:", error);
    
    if (error.status === 429 || error.message?.includes("429")) {
        return NextResponse.json({ 
          error: "Processing limit reached (Gemini 429). To bypass shared mainframe constraints, configure your own free Gemini API key in System Settings." 
        }, { status: 429 });
    }
    
    return NextResponse.json({ error: error.message || "Mainframe connection lost." }, { status: 500 });
  }
}
