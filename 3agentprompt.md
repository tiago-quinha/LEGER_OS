Run 3 pre-launch audits on my codebase. Don’t change anything destructive or rack up cost — read-only recon.
1. RED-TEAM (hacker): hunt for exposed secrets/API keys in the frontend, missing or true RLS policies, IDOR, paywall/purchase bypasses, public storage buckets, and any PII a logged-in user can read about others. Rank by severity.

2. LAWYER (suing me): check age gate, privacy policy + terms (do the links actually resolve?), user-generated content with no report/block, marketing-email compliance, and liability disclaimers.

3. COMPETITOR (trash-talking me): find the weakest 5 things a rival would screenshot — broken flows, monetization holes, features that don’t actually work yet.
Give me a severity-ranked findings list with file paths, and fix the clear-cut critical ones.