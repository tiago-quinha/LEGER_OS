# Multi-Provider AI Bridge & Ingestion

LEGER_OS interfaces with AI providers through `src/lib/ai-bridge.ts`.

## Supported Providers
1. **Google Gemini (`gemini-2.5-pro`):** Preferred default engine. (Note: Never use `1.5-flash`).
2. **OpenAI (`gpt-4o-mini`):** High-precision fallback for statement parsing.
3. **Groq (`llama-3.3-70b-versatile`):** Sub-100ms ultra-low latency response.
4. **Local Ollama (`llama3` / `mistral`):** 100% free local inference without API tokens or network calls.

## API Endpoint Integration
- `/api/categorize`: Automated category classification.
- `/api/analyze-cycle`: Paycheck cycle burn rate analysis.
- `/api/ingest/ai-parse`: Statement text extract normalization.
- `/api/leger-ai/query`: Conversational mainframe assistant.
