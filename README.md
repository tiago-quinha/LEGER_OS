# LEGER_OS // Personal Finance Mainframe

> **Empirical Liquidity Engine & Zero-Credential Financial Intelligence**

[![Production Web App](https://img.shields.io/badge/Live%20App-https%3A%2F%2Fleger--os.vercel.app-10b981?style=for-the-badge)](https://leger-os.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Capacitor Native](https://img.shields.io/badge/Capacitor-Android%20Native-3880ff?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%204-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20%2F%20All%20Rights%20Reserved-red?style=for-the-badge)](./LICENSE)

---

## Mobile-First Architecture & Platform Access

> **IMPORTANT**: **LEGER_OS is architected primarily as a mobile-first operating system** (Android Native `.apk` / Mobile Progressive Web App). 
> 
> The core automation capabilities—such as **Zero-Credential Android Push Ingestion** and **iOS Apple Wallet Automations**—require a mobile device to capture real-time payment events. Desktop browsers are fully functional for deep ledger audits, but mobile is the primary intended form factor.

* **Web Application / PWA:** [https://leger-os.vercel.app](https://leger-os.vercel.app) (Install via Safari / Chrome *"Add to Home Screen"*)
* **Android Native APK:** [Download Direct APK](https://leger-os.vercel.app/downloads/leger-os.apk)

---

## The Core Problem: Why Aggregators Fail

Traditional personal finance applications (YNAB, Monarch, Copilot) charge **$70–$120/year** while relying on third-party Open Banking aggregators (Plaid, Salt Edge, GoCardless). In practice:
1. **High Sync Failure Rate (~22%):** Bank API connections routinely break, requiring constant re-authentication.
2. **Privacy Vulnerabilities:** Users must hand over banking login credentials to foreign third-party intermediaries.
3. **Rigid Calendar Slicing:** Incumbents force tracking into calendar months (Day 1–31), ignoring real-world bi-weekly, 4-week, or irregular salary deposit cycles.

**LEGER_OS eliminates aggregators entirely** by replacing them with local device-level notification listeners and webhook automations.

---

## Key Engineering Features

### 1. Universal Zero-Credential Android Ingestion
* Uses a custom Capacitor Java plugin (`LegerBankSyncPlugin`) with a native `NotificationListenerService`.
* **Zero Storage:** Payment push notifications are processed in device memory via deterministic regex parsing to extract merchant, amount, and currency. The raw text and any PII/OTPs are discarded immediately.
* **Agnostic to Any Bank:** Supports any banking application, digital wallet (MB WAY, Apple Pay, Google Wallet), fintech (Revolut, Wise, N26), or broker (XTB, Trade Republic) installed on your device.

### 2. iOS Apple Shortcuts Integration
* Provides a secure, private webhook endpoint (`/api/transactions/device-push`).
* Integrates directly with native Apple Shortcuts automations triggered upon Apple Pay transactions with zero cloud credential sharing.

### 3. Mathematical Projection Engine & Recency Decay
Future liquidity is projected daily using statistical analysis rather than static historical averages:
* **Recency Decay Weighting ($\lambda = 0.12$):** Spending velocity applies exponential time-decay weighting (~6-day half-life), prioritizing recent spending momentum over older expenses.
* **Heavy Current Cycle Alpha ($\alpha \ge 0.65$):** Forecasts favor the active paycheck cycle over distant historical baselines:
  $$\alpha = \min(1.0, 0.65 + 0.35 \cdot (\text{days elapsed} / \text{total days}))$$
* **Zero Synthetic Interpolation:** Plotted charts only map executed transactions or verified market ticks—never synthetic linear price interpolations.

### 4. Multi-Provider Conversational AI Bridge
Integrated neural interface supporting custom API keys and local offline inference:
* **Google Gemini** (`gemini-2.5-pro`)
* **OpenAI** (`gpt-4o-mini`)
* **Groq** (`llama-3.3-70b-versatile`)
* **Local Ollama** (100% free local offline inference without external API tokens)

---

## Tech Stack

* **Frontend:** Next.js 16.2 (Turbopack, App Router), React 19, Tailwind CSS 4, Lucide Icons, Recharts, Framer Motion.
* **Backend & Database:** Supabase (PostgreSQL with Row Level Security, Storage, Realtime).
* **Mobile Runtime:** Capacitor 6 with native Android Java bridge.
* **AI Bridge:** Multi-provider client wrapper with fallback heuristics.
* **Hosting:** Vercel Edge Runtime & Serverless Functions.

---

## Security & Privacy Safe-Deposit Standard

* **Zero Bank Logins:** LEGER_OS never asks for, stores, or transmits your banking credentials.
* **Encrypted Transmission:** All telemetry and database queries are transmitted over 256-bit SSL encryption.
* **Isolated Multi-Tenant Storage:** Secured by PostgreSQL Row Level Security (RLS) policies isolating user records strictly to authenticated IDs.

---

## License & Intellectual Property

Copyright © 2026 LEGER_OS. All Rights Reserved.

LEGER_OS is source-available software provided under a **Strict Proprietary License**.

* **Allowed:** Personal, non-commercial educational review, local evaluation, and security auditing.
* **Prohibited:** Commercial use, public hosted SaaS/cloud deployments, re-licensing, distribution, mobile app store republishing, or creating unauthorized commercial forks/derivatives.

For full terms and conditions, see the [LICENSE](./LICENSE) file.
