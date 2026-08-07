# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-Layer Architecture (`directives/`, `orchestration`, `execution/`) coupled with an **Obsidian Vault First Policy** to maximize precision and reliability.

---

## 🔒 Mandatory Obsidian Vault Protocol (Vault-First Policy)

1. **Check Obsidian Vault Before Executing:**
   Before forming a hypothesis, writing code, or answering architecture questions, you **MUST** first inspect the **LEGER_OS Obsidian Vault** (`LEGER_OS/` or via Obsidian MCP tools).
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
