# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-Layer Architecture (`directives/`, `orchestration`, `execution/`) coupled with an **Obsidian Vault First Policy** to maximize precision and reliability.

---

## 🔒 Mandatory Obsidian Vault Protocol (Vault-First Policy)

1. **Check Obsidian Vault Before Executing:**
   Before forming a hypothesis, searching the codebase, writing code, or answering architecture questions, you **MUST** first inspect the **LEGER_OS Obsidian Vault** (`LEGER_OS/` or via Obsidian MCP tools).
   - Read the relevant SOP directive in `LEGER_OS/01 - Directives (SOPs)/`.
   - Read the current cycle note in `LEGER_OS/02 - Paycheck Cycles/`.
   - Verify calculation standards in `LEGER_OS/00 - System & AI/Mathematical Projection Engine.md`.

2. **Use Obsidian MCP Tools:**
   Prefer querying the Obsidian MCP server (`leger-obsidian-vault` or `leger-obsidian-rest`) to fetch context, search notes, or update task Kanbans.

3. **Update Obsidian Vault with Learnings:**
   Whenever an edge case, API limit, or error is resolved, update the corresponding Markdown SOP inside `LEGER_OS/01 - Directives (SOPs)/` or trigger `python build_full_vault.py`.

---

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- Live in `directives/` and `LEGER_OS/01 - Directives (SOPs)/`.
- Define goals, inputs, tools/scripts to use, outputs, and edge cases.

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in order, handle errors, update directives with learnings.

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in root / `execution/` (`import_transactions.py`, `audit_balances.py`, `update_schema.py`, `build_full_vault.py`).

---

## Operating Principles

1. **Check Obsidian & execution tools first.**
2. **Self-anneal when things break:** Fix the code, test it, and update the Obsidian directive note.
3. **Preserve Mathematical Invariants:** Recency decay ($\lambda = 0.12$) and current cycle alpha ($\alpha \ge 0.65$).
4. **PostgREST Invariant:** SQL migrations must finish with `NOTIFY pgrst, 'reload schema';`.
5. **Standardized Emerald PRO Theme & Normalized `ProLockOverlay` Invariant:** Reserve Emerald Green (`text-emerald-500`, `bg-emerald-500/10`, `border-emerald-500/30`) strictly for PRO/Premium features. Non-PRO security/privacy indicators (e.g. Privacy Safe-Deposit mode, floating AI trigger lock badge) must use neutral monochrome styling (`text-muted-foreground bg-card border-border`). All locked PRO features across all views must use the standard `<ProLockOverlay />` component. On chart/graph overlays, wrap `ProLockOverlay` in an opaque/blurred `bg-background/95 backdrop-blur-md` backdrop so data is completely non-interactive and hidden.
6. **No Pseudo-Terminal Underscore Typography Invariant:** Ban pseudo-terminal uppercase underscore jargon in UI copy (e.g., `PRO_ACTIVE`, `CORE_FREE`, `PRO_LOCKED`, `HTTP_403_DENIED`, `SECURITY_GATEKEEPER`, `SUPER_USER`). Always use clean, professional natural English typography (e.g., `PRO Active`, `Core Free`, `PRO Locked`, `Access Forbidden`, `Security & Permissions`).
7. **Transparent Tax-Inclusive Pricing Invariant:** All Stripe payment sessions and intents MUST set `tax_behavior: "inclusive"`. The advertised price in the application (e.g. €4.99, €2.50, $5.50, £4.50) MUST match the exact final amount charged to the user with zero added tax surprises at checkout.
8. **Native Embedded Dark Payment Drawer Standard:** All payment, checkout, and billing management flows MUST use native in-app bottom slide-up drawers (`StripePaymentModal.tsx` and `StripeManageDrawer.tsx`) matching the LEGER_OS dark theme (`#09090b`), sharp borders (`border-border`), mono typography, and Emerald Green action buttons (`bg-emerald-600 text-white`). Include the official standard compliance footer: `🔒 256-BIT SSL ENCRYPTED · POWERED BY stripe`.
9. **Proactive AI Pill Banner & Empirical Detection Invariant:** Proactive AI pill banners MUST only display real, calculated telemetry data (uncategorized transactions, projected surplus/deficit, velocity multiplier, safe daily burn, net cash flow, top/lowest spend categories, active routine overrides, target budget %, recent purchase merchant & amount). NEVER output vague speculative suggestions, promotional prompts, or fake text ("Spot spending anomalies...", "Run AI Cleanse..."). Banner triggers must be event-driven (high priority on uncategorized items, velocity spikes >1.25x, budget >85%; throttled 35% chance on routine routes to save tokens). Banner clicks MUST initiate fresh chat sessions with an AI-originated message (`sender: "assistant"`), never a user auto-prompt. Ban all decorative emojis from AI banner titles, and never hardcode tenant-specific company or bank names (e.g. "Deloitte", "Santander").
10. **Transcript Recovery Invariant:** When a file is reported lost or reverted to a wrong state, ALWAYS recover it by reading `transcript_full.jsonl` from the relevant subagent or conversation log and extracting the exact `CodeContent` from the `write_to_file` step using Python. Write it directly to the file path. NEVER use `git stash`, `git checkout`, or manual rewrites from memory as recovery mechanisms — these destroy working incremental state.
11. **No Mid-Session Whole-File Rewrite Invariant:** During an active editing session, NEVER replace an entire file from a transcript step or backup while incremental edits have already been made. Always apply surgical `replace_file_content` / `multi_replace_file_content` changes to the live working file. The only exception is the very first recovery of a completely missing or wrong file at the start of a session.
12. **Memory Page Card Design Standard:** On `/memory` (`LegerAIPageView.tsx`): Input box must be plain — `Add memory` label + textarea + `Save` button, no Brain icons, no "Mainframe Ingestion", no emerald decorations. Active card footer: date left; right side = stacked column with projection impact text (`↓ X% Category`, plain `text-foreground/80 font-mono font-bold`, no emerald/badges) above `🕐 Expires in Xd` (amber if expiring soon). Expired memories: always visible as a separate section below active cards, faded + strikethrough, no collapse toggle. No Brain icon anywhere on the memory page.
13. **Strict Subpage UI & Typography Normalization Invariant**: Every subpage header and view layout MUST strictly match the app's established design language:
    - Header Eyebrow: `flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground` with standard Lucide icon + uppercase title.
    - Page Title: `<h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">` using Geist Sans (`font-sans`).
    - Executive Metric Cards: Wrap in `<Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">` with `<span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">`, monospaced values (`text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10`), and `<ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />`.
    - Tab Controls: `border border-border bg-card/20 text-xs font-mono` with active `bg-secondary text-foreground border-b-2 border-b-foreground` states.
    - Floating Add Button: White rounded-xl square FAB (`fixed bottom-20 right-4 z-50 h-12 w-12 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20`) on mobile routes.
    - Always inspect existing views (e.g. `ExpensesView.tsx`) BEFORE creating or updating any view to guarantee 100% visual consistency.
14. **Native Draggable Bottom Drawer Standard**: All input, edit, and configuration overlays across the application (Add Position, Add Transaction Entry, Stripe Payments, AI Query Drawer) MUST use native bottom slide-up drawers instead of standard center dialog modals. Drawers must feature a Framer Motion slide-up animation (`initial={{ y: "100%" }} animate={{ y: 0 }}`), top drag handle indicator (`w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2 cursor-grab active:cursor-grabbing`), draggable swipe-down dismiss gesture (`drag="y" dragConstraints={{ top: 0, bottom: 0 }}`), dark `#09090b` background, backdrop blur, and sharp borders.

