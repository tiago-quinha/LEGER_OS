# AI Prompts & System Rules

This file documents the system prompts and operational rules for LEGER_OS AI ingestion and assistant query bridge (`src/lib/ai-bridge.ts`).

## Core Ingestion Prompt Rules
1. Never hallucinate transaction amounts or dates.
2. Use raw extracted statement text for payee recognition.
3. Automatically flag unrecognized sign inversions (e.g., Santander debit extracts).
4. Respect client-passed `x-ai-provider` and `x-custom-api-key` headers.
