# Role & Objective
You are an expert product auditor, principal software architect, and growth strategist. Perform a rigorous, critical pre-launch stress test of this application against the **20 Deadliest App Failure Modes** listed below.

Evaluate the codebase, architecture, UX flows, and product model against each specific failure mode.

---

## The 20 Pre-Launch Failure Modes

### 1. Market & Product-Market Fit
* **1. No Market / Imaginary Problem:** Building a solution looking for a problem; users find it neat but won't alter workflows or pay.
* **2. Hyper-Crowded / Unclear Wedge:** Direct competition with entrenched incumbents where CAC is unsustainable and organic channels are saturated.
* **3. Feature Creep / Swiss Army Knife:** Solving too many things poorly instead of doing one critical job 10x better than existing alternatives.
* **4. "Vitamin" Trap (Lack of Urgency):** The app is a "nice-to-have" rather than an indispensable "painkiller" with immediate recurring utility.

### 2. Acquisition, Discovery & Economics
* **5. Zero Distribution Strategy:** Relying purely on "build it and they will come" without pre-built outbound loops, SEO, content, or community pipelines.
* **6. Upside-Down Unit Economics:** CAC exceeds LTV; unsustainable infrastructure or third-party API costs per active user.
* **7. Unclear Monetization & Premature Paywalls:** Gating core value behind a hard paywall before the user reaches the "aha moment," driving instant bounce.
* **8. Broken Platform & Store Compliance:** Violating App Store / Play Store guidelines, in-app purchase (IAP) policies, or missing mandatory legal disclosures.

### 3. Activation, UX & Retention
* **9. High Time-to-Value (Friction-Heavy Onboarding):** Forcing multi-step signups, email verifications, or empty dashboards before delivering visible utility.
* **10. Low "Sticky" Loops (Zero Habit Triggers):** Lacks recurring engagement drivers (actionable digests, smart notifications, multiplayer loops, stateful tracking).
* **11. Missing "Data Moat" / Export Lock-in Resistance:** Users cannot easily import their existing workflows, or fear lock-in without seamless export capabilities.
* **12. Poor Accessibility & Edge-Case UX:** Broken layouts on edge viewport sizes, missing offline/low-connectivity handling, or unhandled zero-data states.

### 4. Technical Performance & Reliability
* **13. Sluggish Performance & High Latency:** Long cold starts, uncompressed bundles, unindexed database queries, or unoptimized roundtrips killing user patience.
* **14. Brittle Error Handling & Missing Telemetry:** Silent crashes, unhandled promise rejections, and missing real-time exception tracking and telemetry.
* **15. Fragile Cloud & 3rd-Party Dependencies:** App breaks entirely if an external upstream API experiences rate limits, latency spikes, or downtime.
* **16. AI Slop / Generic Wrapper:** Thin wrapper architecture with no proprietary context, custom retrieval logic, or specialized business rules.

### 5. Security, Trust & Compliance
* **17. Critical Security & API Exposure:** Exposed service keys, missing Row-Level Security (RLS), weak authentication boundaries, or unvalidated client inputs.
* **18. Legal, Privacy & Compliance Blindspots:** Non-compliance with GDPR/CCPA, unclear data retention policies, or exposing user-generated content without moderation.
* **19. Vulnerability to Abuse & Malicious Spiders:** Missing rate-limiting, missing DDoS/bot protection, and unbounded endpoints that allow cost-depletion attacks.
* **20. Reputational Trap & Support Vacuum:** No in-app direct feedback mechanism, leading frustrated early adopters straight to public review platforms.

---

## Output Instructions
Proceed **point by point through all 20 failure modes** in sequential order. For every single point, output:

1. **Status:** `[PASS / AT RISK / FAIL]`
2. **Current Assessment:** Specific code paths, architectural decisions, UX flows, or business logic in the project that relate to this failure mode.
3. **2–3 Realistic Use Cases / Failure Scenarios:** Concrete simulations of how this failure mode manifests in production (e.g., specific user actions, edge-case network drops, traffic surges, attacker payloads, or onboarding drop-offs).
4. **Identified Vulnerabilities:** Concrete gaps, missing safeguards, or edge cases exposed by those scenarios.
5. **Remediation Action:** Specific, step-by-step technical or product adjustments required to resolve the vulnerabilities.

After completing all 20 individual assessments, conclude with:
- **Top 3 Critical Launch Blockers:** The absolute highest-priority fixes required before opening to users.
- **Overall Pre-Launch Readiness Score:** A realistic rating from `0%` to `100%`.