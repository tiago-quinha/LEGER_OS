# Category Merchant & Regex Matching Index

This document maps Portuguese merchant descriptors to automated category assignments used in `import_transactions.py` and `seed_rules.py`.

---

## 1. Income & Payroll
- **Regex Pattern:** `DELOITTE`
- **Category:** `DELOITTE Salary & Income`
- **Type:** Income Inflow

---

## 2. Groceries & Supermarkets
- **Regex Patterns:** `PINGO DOCE`, `CONTINENTE`, `AUCHAN`, `MERCADONA`, `LIDL`, `ALDI`, `INTERMARCHE`
- **Category:** `Groceries & Essentials`
- **Type:** Variable Essential (Recency Decay $\lambda = 0.12$)

---

## 3. Fuel & Transportation
- **Regex Patterns:** `GALP`, `REPSOL`, `BP`, `CEPSA`, `PRIO`, `UBER`, `BOLT`, `CP - COMBOIOS`, `METRO`
- **Category:** `Transport & Fuel`
- **Type:** Variable Essential

---

## 4. Dining & Leisure
- **Regex Patterns:** `UBER EATS`, `GLOVO`, `MC DONALDS`, `BURGER KING`, `STARBUCKS`, `RESTAURANTE`, `PADARIA`
- **Category:** `Dining & Leisure`
- **Type:** Variable Non-Essential

---

## 5. Housing & Utilities
- **Regex Patterns:** `EDP`, `SU ELECTRICIDADE`, `MEO`, `NOS`, `VODAFONE`, `AGUAS`, `CONDOMINIO`
- **Category:** `Utilities & Subscriptions`
- **Type:** Fixed Monthly Obligation
