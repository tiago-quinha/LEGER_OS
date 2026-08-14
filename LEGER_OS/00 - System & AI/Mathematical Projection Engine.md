# Mathematical Projection Engine Standards

The **LEGER_OS Daily Projection Engine** (`simulateExpertDailyProjection` in `DashboardView.tsx`) models future end-of-day cash balances using professional personal data analyst standards.

---

## 1. Recency Decay Weighting
Variable spending is calculated using an exponential time-decay weighting ($\lambda = 0.12$, representing a ~6-day half-life). Recent transactions carry exponentially higher weight than older transactions in the cycle:

$$
w_i = e^{-\lambda \cdot (t_{\text{current}} - t_i)}
$$

Where:
- $\lambda = 0.12$ (~6-day half-life).
- $t_{\text{current}}$ is the current day of the cycle.
- $t_i$ is the timestamp of transaction $i$.

To prevent "zero-spend" days from crashing the projection artificially low on lumpy expense patterns (e.g. weekly grocery trips), the raw exponential decay burn is blended $50/50$ with the cycle's unweighted daily average burn ($v_{\text{unweighted}} = \frac{\text{unweighted variable spend}}{\text{days elapsed}}$):

$$
v_{\text{current}} = \frac{v_{\text{decay}} + v_{\text{unweighted}}}{2}
$$

---

## 2. Heavy Current Cycle Alpha ($\alpha$)
When blending current cycle velocity with multi-month historical baselines, the weighting factor ($\alpha$) heavily favors the current cycle:

$$
\alpha = \min\left(1.0, 0.65 + 0.35 \cdot \frac{\text{days elapsed}}{\text{total days}}\right)
$$

- Day 1: $\alpha = 0.65$ (65% weight on current cycle).
- Day 30: $\alpha = 1.00$ (100% weight on current cycle).

---

## 3. Conversational AI Overrides (`leger_cycle_overrides`)
Users can set natural language assumptions in Leger AI (e.g., *"I'm working hybrid, reduce gas spend by 30%"*).
These overrides are stored in `localStorage` (`leger_cycle_overrides`) and dynamically modify category burn rates inside the simulation without requiring UI widgets.
