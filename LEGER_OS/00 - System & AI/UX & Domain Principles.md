# UX & Domain-Specific Principles

LEGER_OS adheres to strict cognitive UX standards across all components:

1. **Chunking:** Group transaction listings, budget items, and account balances into logical, digestible units (3-5 items per block).
2. **Recognition over Recall:** Persist selected paycheck cycles, search queries, and filters across views (Dashboard vs. Expenses).
3. **Loss Aversion:** Highlight potential budget overruns early. Require explicit confirmation dialogs before deleting transactions or rules.
4. **Doherty Threshold (<400ms):** Maintain instant system response times. Render skeleton shimmer loaders for AI processing.
5. **Goal Gradient Effect:** Display budget progress bars, paycheck day progress, and automated categorization ratios.
6. **Responsive Data Invariance:** Ensure financial figures, currency symbols, and prefix operators (e.g., `+`, `-`) never wrap or break onto separate lines on lower screen resolutions. Implement `whitespace-nowrap` on these data wrappers and switch containers from horizontal flexrows to vertical stacks (`flex-col`) on narrow viewports to preserve clean alignment.
7. **Optimistic Reactance (0ms perceived lag):** Update client-side state models immediately upon user updates or deletions, dismissing configurations and showing instant toast notifications. Run database syncs in the background, only rolling back state models upon background sync failure to maximize fluid user response times.
8. **Unified Skeleton Continuity:** Never show mismatched global skeleton indicators during subpage transitions. Route-specific loader skeletons must match the page's component hierarchy to eliminate layout shifting.
9. **Viewport-Aware Render Invariant:** For tall mobile pages and dashboard views, wrap below-the-fold layout sections in `[content-visibility:auto] [contain-intrinsic-size:1px_300px]`. This skips off-screen layout and paint calculations during horizontal swipe animations and scroll passes, maintaining 60fps gesture response.
