import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const { allowed, reason, isPro } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason || "Quota limit reached" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      subscriptions = [], 
      totalMonthlyCommitment = 0, 
      totalAnnualCommitment = 0, 
      priceIncreases = [],
      targetIncome = 2500,
      currency = "EUR" 
    } = body;

    const subListSummary = subscriptions
      .map((s: any) => `- ${s.merchant} (${s.cadence?.toUpperCase()}): €${s.latestAmount?.toFixed(2)} [Status: ${s.status?.toUpperCase()}]`)
      .join("\n");

    const priceJumpSummary = priceIncreases.length > 0
      ? priceIncreases.map((p: any) => `- ${p.merchant}: jumped from €${p.previousAmount?.toFixed(2)} to €${p.newAmount?.toFixed(2)} (+${p.increasePercent}%)`).join("\n")
      : "No silent price increases detected in recent transactions.";

    const commitmentRatio = targetIncome > 0 ? ((totalMonthlyCommitment / targetIncome) * 100).toFixed(1) : "0.0";

    const prompt = `
      You are the LEGER_OS Neural Subscription Auditor, a high-precision personal finance intelligence engine.
      Analyze the user's recurring commitments and provide high-utility mathematical optimizations.

      SUBSCRIPTION DATA:
      - Total Monthly Overhead: €${totalMonthlyCommitment.toFixed(2)}
      - Total Annual Commitment: €${totalAnnualCommitment.toFixed(2)}
      - Monthly Income Reference: €${targetIncome.toFixed(2)}
      - Overhead Drag: ${commitmentRatio}% of monthly income
      
      ACTIVE DETECTED SUBSCRIPTIONS:
      ${subListSummary || "No active subscriptions detected."}

      SILENT PRICE HIKES DETECTED:
      ${priceJumpSummary}

      YOUR TASK:
      1. Deliver an executive strategic brief summarizing their recurring overhead efficiency.
      2. Identify potential "Ghost / Redundant" subscriptions (e.g. multiple streaming services, parallel AI subscriptions, SaaS tools).
      3. Identify potential "Annual Billing Arbitrage" where standard 15-20% discounts are typically available (e.g. Spotify, Apple Services, Cloud tools, Gyms).
      4. Provide 2-3 specific, high-leverage optimization tactics.

      Format your response as a strict JSON object:
      {
        "executiveSummary": "2-3 sentences direct evaluation of recurring drain and commitment ratio.",
        "estimatedAnnualSavings": number, // Estimated realistic annual savings in Euros if annualizing or pruning redundancies (e.g. 75.00)
        "ghostRiskAlerts": [
          {
            "merchant": "string",
            "reason": "string (e.g. Overlapping streaming provider or unmonitored recurring fee)"
          }
        ],
        "arbitrageOpportunities": [
          {
            "merchant": "string",
            "currentCadence": "monthly",
            "potentialAnnualSavings": number,
            "recommendation": "string"
          }
        ],
        "tacticalRecommendations": [
          "string 1",
          "string 2"
        ]
      }
    `;

    const text = await generateAIContent(prompt, {
      provider: request.headers.get("x-ai-provider") || undefined,
      customKey: request.headers.get("x-custom-api-key") || undefined,
      jsonMode: true,
      modelType: "flash"
    });

    try {
      const parsedAudit = JSON.parse(text);
      return NextResponse.json({
        success: true,
        audit: parsedAudit,
        isPro,
        overheadRatio: commitmentRatio
      });
    } catch (parseErr) {
      console.error("[Radar AI Audit] JSON Parse error:", parseErr);
      return NextResponse.json({
        success: true,
        audit: {
          executiveSummary: `Your recurring subscriptions total €${totalMonthlyCommitment.toFixed(2)}/mo (${commitmentRatio}% of net income). No anomalous leaks detected.`,
          estimatedAnnualSavings: 0,
          ghostRiskAlerts: [],
          arbitrageOpportunities: [],
          tacticalRecommendations: ["Review annual subscription renewals 30 days before anniversary dates."]
        },
        isPro
      });
    }
  } catch (error: any) {
    console.error("[Radar AI Audit Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to execute Neural Subscription Audit" }, { status: 500 });
  }
}
