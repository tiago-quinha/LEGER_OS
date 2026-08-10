# Memory Page Design Standard

Created: 2026-08-10
Tags: #design #memory #invariant

---

## Card Layout — Active Memories

- **Top row:** Category dot + label (mono uppercase) | +7d extend button (if expiring soon) + trash icon
- **Content:** `text-xs font-bold text-foreground leading-relaxed`
- **Footer row:** `items-end justify-between`
  - Left: Calendar icon + en-GB date created
  - Right: stacked column (`flex-col items-end gap-0.5`)
    - Projection impact text (if present): e.g. `- 30% Gas` - plain `font-mono font-bold text-[9px] text-foreground/80`, NO emerald, NO badge, NO border
    - Clock + duration: amber (`text-amber-500`) if expiring soon, else `text-foreground/75`

## Input Box

- Title: `Add memory` (`text-xs font-bold`)
- Compact textarea (`min-h-[72px]`)
- Submit: `Save` button (`bg-foreground text-background`)
- NO Brain icon, no Mainframe Ingestion label, no emerald decorations anywhere

## Expired Memories Section

- Always visible below active cards in their date group, NO collapse toggle
- Cards at opacity-40 hover:opacity-60
- Content: line-through text-foreground/60
- Footer: date left | Clock + Expired right (plain muted)

## Emerald Invariant Reminder

Emerald green is strictly reserved for PRO features only. Projection impact on memory cards is NOT a PRO feature — must use neutral text-foreground/80.

## No Brain Icon Rule

Brain (lucide) must NOT appear anywhere on /memory — not in header, not in input box, not in cards.
