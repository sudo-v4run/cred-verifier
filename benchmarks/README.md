# Mainnet Research Benchmark Suite

End-to-end performance measurement for the research paper:

> *"TrustVault: Decentralised Academic Credential Verification on the Internet Computer Protocol"*

Benchmarks run **exclusively on IC mainnet** against the deployed canister.
No synthetic data, no local replica — real-world measurements only.

---

## What is Measured

| Suite | What it proves | Key metric |
|---|---|---|
| **Issuance** | Latency and throughput as N certificates are issued (N = 1, 10, 100, 1 000, 10 000). Sequential and parallel modes. | Mean/p95/p99 latency, certs/s |
| **Verification** | Query-call verification latency and throughput at N = 1 → 10 000 concurrent verifiers. Certificate lookup by student ID / university name. | Query latency (ms), queries/s |
| **Concurrent** | Mixed workload: 30% issuance + 70% verification at C = 1, 5, 10, 25, 50, 100, 500 simultaneous callers. ICP finality measurement. | ops/s, error rate, finality (ms) |
| **Throughput** | 60-second sustained issuance, Merkle tree rebuild time vs DB size, and peak burst (1 000 simultaneous calls). | certs/s over time, O(N log N) growth |

---

## Prerequisites

```bash
# 1. Deploy the backend canister to mainnet
dfx deploy --network ic

# 2. Note the canister ID from dfx output, then export it
export CANISTER_ID=<credential_backend_canister_id>
# Or add to your project .env file:
#   CANISTER_ID_CREDENTIAL_BACKEND=<id>

# 3. Install Node.js dependencies
cd benchmarks
npm install
```

---

## Running Benchmarks

```bash
cd benchmarks

# Run all suites (recommended for a full research dataset)
node run.js

# Run a specific suite
node run.js --suite issuance
node run.js --suite verification
node run.js --suite concurrent
node run.js --suite throughput

# Help
node run.js --help
```

Results are saved as JSON files in `benchmarks/results/`.

> **Estimated run times on mainnet:**
> - `issuance`     — ~2–4 hours (sequential issuance up to N=1000)
> - `verification` — ~30–60 min (pre-populate + query at all scales)
> - `concurrent`   — ~1–2 hours (C up to 500 mixed callers)
> - `throughput`   — ~30 min (60s sustained + burst)
> - `all`          — ~5–8 hours total

---

## Generating Research Paper Figures

```bash
cd benchmarks/visualize

# Install Python dependencies
pip install -r requirements.txt

# Generate all figures
python3 generate_graphs.py
```

Output in `benchmarks/visualize/figures/`:

| File | Description |
|---|---|
| `Fig01_issuance_latency.png/.pdf` | Issuance latency vs N (sequential + parallel) |
| `Fig02_verification_latency.png/.pdf` | Verification latency vs N (sequential + concurrent) |
| `Fig03_throughput_comparison.png/.pdf` | Throughput comparison across all operations |
| `Fig04_concurrent_users.png/.pdf` | Concurrent users vs time and error rate |
| `Fig05_latency_cdf.png/.pdf` | Latency CDF for issuance and verification |
| `Fig06_merkle_growth.png/.pdf` | Merkle tree rebuild time vs DB size |
| `Fig07_latency_boxplots.png/.pdf` | Latency distributions (box plots) |
| `Fig08_throughput_over_time.png/.pdf` | Throughput stability during 60s sustained load |
| `Fig09_burst_analysis.png/.pdf` | Peak burst: error rate and latency percentiles |
| `Fig10_finality_time.png/.pdf` | ICP finality vs Ethereum/Bitcoin (reference comparison) |
| `summary_table.tex` | LaTeX table for direct inclusion in paper |
| `dashboard.html` | Interactive Plotly dashboard |

### Include in your LaTeX paper:
```latex
\input{benchmarks/visualize/figures/summary_table}
\includegraphics[width=\linewidth]{benchmarks/visualize/figures/Fig01_issuance_latency}
```

---

## File Structure

```
benchmarks/
  run.js                # Main CLI runner
  package.json
  README.md             # This file
  suite/
    config.js           # Research scales & canister settings
    agent.js            # IC mainnet actor factory
    identity.js         # Stable Ed25519 identity for update calls
    scalability.js      # runIssuance  — issuance benchmark
    concurrency.js      # runVerification — verification benchmark
    finality.js         # runConcurrent — mixed concurrent workload
    stress.js           # runThroughput — sustained load & Merkle growth
    stats.js            # Statistical helpers (mean, p95, p99, CDF ...)
    reporter.js         # Console logging and JSON result writer
  results/              # Benchmark JSON outputs (git-ignored)
  visualize/
    generate_graphs.py  # Matplotlib + Plotly figure generator
    requirements.txt
    figures/            # Generated figures (git-ignored)
```

---

## Research Claims Validated

| Claim | Suite | Evidence |
|---|---|---|
| Sub-second query verification | Verification | p50 < 300ms at N=10 000 |
| O(log N) Merkle proof | Verification, Throughput | Latency grows sub-linearly with N |
| ~2s finality (vs ~12s Ethereum) | Concurrent | Finality histogram, median < 3s |
| Near-linear throughput under concurrency | Concurrent | ops/s vs C graph |
| Stable latency under sustained load | Throughput | 10-second throughput windows |
