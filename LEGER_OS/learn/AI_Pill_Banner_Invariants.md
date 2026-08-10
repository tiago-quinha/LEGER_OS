---
title: AI Pill Banner Invariants & Multi-Tenant Protocol
date: 2026-08-09
tags:
  - SOP
  - AI
  - Invariants
  - LEGER_OS
---

# 🧠 Proactive AI Pill Banner & Multi-Tenant Invariants

## Core Principles & Learned Behavior

### 1. AI-Initiated Chat Protocol
- Clicking proactive AI insight banners must **never** insert a simulated user message (`sender: "user"`).
- It must launch a fresh chat session initiated directly by the AI Assistant (`sender: "assistant"`), presenting the insight title, context, and follow-up options.

### 2. Strict Multi-Tenant Invariant
- Banner variations, prompt titles, and AI queries must **never** hardcode specific employer names (e.g., "Deloitte") or bank names (e.g., "Santander").
- Always use generic, localized, or profile-driven terms (e.g., "next paycheck", "bank statement extract").

### 3. Smart Event-Driven & Token-Efficient Triggering
- Proactive AI banners must **not** force auto-expansion on every single route navigation.
- High-priority telemetry events (uncategorized transactions, velocity spikes `>1.25x`, budget burn `>85%`) trigger immediate auto-expansion.
- Routine variations use a **smart throttled probability check** (e.g., 35% chance, max once per 3 minutes per route) to conserve user attention and API tokens.

### 4. Zero Emoji Minimal UI Standard
- In accordance with Minimal UI Standards, AI banner titles and system prompts must **never** include decorative emojis (e.g., `⚡`, `📈`, `🎯`, `🤖`). Use clean, minimal typography.
