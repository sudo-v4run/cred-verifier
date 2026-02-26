# Benchmark Suite — ICP Academic Credential Verification

End-to-end performance evaluation for the research paper claim:
> *"ICP provides high scalability, low latency, and low cost for decentralised academic credential issuance and verification."*

---

## What is Measured

| Suite | What it proves |
|---|---|
| **Scalability** | Issuance + verification latency stays bounded as N grows (1 → 100 certs). Parallel issuance shows linear throughput gains. Merkle proof time is O(log N) on the server. |
| **Concurrency** | Throughput (ops/sec) grows near-linearly with concurrent requests — demonstrating ICP's subnet-level horizontal scalability. p95 latency remains stable under load. |
| **Finality** | ICP's consensus finality is ~1–2 s (vs Ethereum ~12 s, Bitcoin ~60 min). Query calls return in ~100–200 ms with no finality cost. |

---

## Quick Start

### 1 · Install dependencies

```bash
cd benchmarks
npm install
```

### 2 · Dry-run (no canister needed — synthetic data)

Useful to test the full pipeline, including visualisation, before mainnet deployment.

```bash
node run.js --dry-run
```

### 3 · Run against mainnet (after deployment)

```bash
# Deploy first (from project root):
dfx deploy --network ic

# The CANISTER_ID is written to .env automatically.
# Then from benchmarks/:
node run.js --suite all
```

You can also run individual suites:
```bash
node run.js --suite finality      # ~10 min — finality measurements
node run.js --suite scalability   # ~20 min — N=1,10,50,100 tests
node run.js --suite concurrency   # ~30 min — throughput at C=1..50
```

---

## Generating Figures (Research Paper)

```bash
cd visualize
pip install -r requirements.txt
python3 generate_graphs.py
```

This produces in `visualize/figures/`:

| File | Figure |
|---|---|
| `fig1_latency_comparison.png/pdf` | Query call vs update call — p50/p95/p99 |
| `fig2_scalability_issuance.png/pdf` | Issuance latency + throughput vs N |
| `fig3_scalability_verification.png/pdf` | Verification latency + O(log N) Merkle proof |
| `fig4_throughput_concurrency.png/pdf` | Throughput & latency vs concurrency |
| `fig5_finality_cdf.png/pdf` | Finality CDF: ICP vs Ethereum vs Bitcoin |
| `fig6_finality_histogram.png/pdf` | Finality time distribution + KDE |
| `fig7_blockchain_comparison.png/pdf` | Log-scale finality comparison (bar) |
| `fig8_overview.png/pdf` | Combined throughput + latency stability |
| `summary_table.tex` | LaTeX table — copy-paste into paper |
| `dashboard.html` | Interactive Chart.js dashboard |

> If no `results/` JSON files are found, the script falls back to synthetic
> data that mirrors expected ICP mainnet behaviour. The figures will be
> labelled as synthetic.

To view the dashboard, open `visualize/figures/dashboard.html` in any browser.

---

## Result File Format

Each benchmark run appends a JSON file to `results/`:

```
results/
  scalability_2026-02-26T12-00-00-000Z.json
  concurrency_2026-02-26T12-30-00-000Z.json
  finality_2026-02-26T13-00-00-000Z.json
```

The visualiser always reads the **most-recent** file per suite.

---

## ICP-Specific Claims This Suite Validates

1. **~2 s finality** — the `finality` suite measures update-call round-trip which
   equals ICP's consensus finality (no separate confirmation step needed).

2. **Sub-200 ms query calls** — `verifyCertificate` is a query call; the
   `finality` suite measures both, showing a **10–15× speedup** over update calls.

3. **Horizontal scalability** — the `concurrency` suite shows throughput scaling
   with concurrent load without p95 latency degradation.

4. **O(log N) Merkle proofs** — the `scalability` suite captures server-side
   proof generation times across tree sizes and overlays the O(log N) curve.

5. **Cost efficiency** — After deployment, cycle balances before/after each test
   are recorded; the LaTeX table expresses cost in USD (1 T cycles ≈ $0.13).

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CANISTER_ID` | *(read from `.env`)* | Backend canister principal |
| `DFX_NETWORK` | `ic` | `ic` (mainnet) or `local` |
| `LOCAL_HOST`  | `http://localhost:4943` | Replica URL for local testing |
