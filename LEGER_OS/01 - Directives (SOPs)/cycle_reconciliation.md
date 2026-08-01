# Directive: Paycheck Cycle Reconciliation

**Layer 1 Directive (SOP)**

## Objective
Reconcile finances at the end of each paycheck cycle (typically triggered by receiving a **DELOITTE** paycheck deposit).

## Process Checklist
- [ ] Record incoming paycheck amount in `income` table / cycle note.
- [ ] Calculate remaining end-of-cycle balance.
- [ ] Run `python audit_balances.py` to update account balance snapshots.
- [ ] Compare projected end balance vs actual ending account balance.
- [ ] Create next cycle note using [[02 - Paycheck Cycles/Cycle Template|Cycle Template]].
