#!/usr/bin/env python3
"""
generate_graphs.py
==================
Research-paper-quality visualisations for the ICP Academic Credential
Verification mainnet benchmark results.

Run after executing: node benchmarks/run.js

Usage:
    cd benchmarks/visualize
    pip install -r requirements.txt
    python3 generate_graphs.py

Outputs (in ./figures/):
    Fig 01 — issuance_latency.pdf/.png
    Fig 02 — verification_latency.pdf/.png
    Fig 03 — throughput_comparison.pdf/.png
    Fig 04 — concurrent_users.pdf/.png
    Fig 05 — latency_cdf.pdf/.png
    Fig 06 — merkle_growth.pdf/.png
    Fig 07 — latency_boxplots.pdf/.png
    Fig 08 — throughput_over_time.pdf/.png
    Fig 09 — burst_error_rate.pdf/.png
    Fig 10 — summary_dashboard.pdf/.png
    dashboard.html    — interactive Plotly dashboard
    summary_table.tex — LaTeX table for the paper
"""

import json, glob, os, sys
from pathlib import Path
from datetime import datetime

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
from matplotlib.gridspec import GridSpec
from scipy import stats as scipy_stats

# ── optional HTML dashboard ──────────────────────────────────────────────────
try:
    import plotly.graph_objects as go
    import plotly.subplots as psp
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

# ── paths ─────────────────────────────────────────────────────────────────────
HERE       = Path(__file__).parent
RESULTS_DIR = HERE.parent / "results"
FIGURES_DIR = HERE / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# ── style ─────────────────────────────────────────────────────────────────────
PAPER_STYLE = {
    "figure.facecolor":  "white",
    "axes.facecolor":    "#f8fafc",
    "axes.grid":         True,
    "grid.color":        "#e2e8f0",
    "grid.linewidth":    0.6,
    "axes.spines.top":   False,
    "axes.spines.right": False,
    "axes.labelsize":    11,
    "axes.titlesize":    12,
    "axes.titleweight":  "bold",
    "xtick.labelsize":   9,
    "ytick.labelsize":   9,
    "legend.fontsize":   9,
    "legend.framealpha": 0.8,
    "font.family":       "sans-serif",
    "font.size":         10,
    "lines.linewidth":   2,
    "lines.markersize":  7,
}
plt.rcParams.update(PAPER_STYLE)

COLORS = {
    "seq":   "#7c3aed",
    "par":   "#2563eb",
    "ver":   "#0891b2",
    "con":   "#059669",
    "burst": "#dc2626",
    "tree":  "#ea580c",
    "mix":   "#7c3aed",
}
MARKERS = ["o", "s", "^", "D", "v", "P"]

# ── helpers ───────────────────────────────────────────────────────────────────

def load_latest(pattern):
    files = sorted(glob.glob(str(RESULTS_DIR / pattern)))
    if not files:
        return None
    with open(files[-1]) as f:
        return json.load(f)

def savefig(fig, name, dpi=200):
    for ext in ("png", "pdf"):
        path = FIGURES_DIR / f"{name}.{ext}"
        fig.savefig(path, dpi=dpi, bbox_inches="tight")
    print(f"  Saved: figures/{name}.png  +  .pdf")

def fmt_n(n):
    if n >= 10_000: return "10k"
    if n >= 1_000:  return f"{n//1000}k"
    return str(n)

def pct(arr, p):
    return float(np.percentile(arr, p))

def cdf(data):
    s = np.sort(data)
    y = np.arange(1, len(s)+1) / len(s)
    return s, y

# ── load data ─────────────────────────────────────────────────────────────────

iss  = load_latest("issuance_*.json")
ver  = load_latest("verification_*.json")
conc = load_latest("concurrent_*.json")
thr  = load_latest("throughput_*.json")

available = {k: v for k, v in [("iss", iss), ("ver", ver), ("conc", conc), ("thr", thr)] if v}
print(f"\nLoaded benchmark files: {list(available.keys())}")
if not available:
    print("ERROR: No result JSON files found in benchmarks/results/")
    print("Run: node benchmarks/run.js  first.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 1  —  Issuance Latency vs N
# ═════════════════════════════════════════════════════════════════════════════

if iss:
    print("\nFig 01: Issuance latency …")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    # Left panel: sequential latency vs N
    ax = axes[0]
    if iss.get("sequential"):
        ns   = [r["n"] for r in iss["sequential"]]
        mns  = [r.get("mean", 0) for r in iss["sequential"]]
        p50s = [r.get("median", r.get("p50", 0)) for r in iss["sequential"]]
        p95s = [r.get("p95", 0) for r in iss["sequential"]]
        p99s = [r.get("p99", 0) for r in iss["sequential"]]
        ax.plot(ns, mns,  "o-", color=COLORS["seq"], label="Mean",   zorder=3)
        ax.plot(ns, p50s, "s--",color=COLORS["seq"], alpha=0.7, label="p50",  zorder=3)
        ax.plot(ns, p95s, "^-.", color=COLORS["par"], alpha=0.7, label="p95",  zorder=3)
        ax.plot(ns, p99s, "D:",  color=COLORS["burst"], alpha=0.7, label="p99", zorder=3)
        ax.fill_between(ns, p50s, p95s, alpha=0.08, color=COLORS["seq"])
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel("Number of Certificates (N)"); ax.set_ylabel("Latency (ms)")
    ax.set_title("Sequential Issuance Latency vs N\n(one cert at a time)")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
    ax.legend()

    # Right panel: parallel throughput vs N
    ax = axes[1]
    if iss.get("parallel"):
        ns  = [r["n"] for r in iss["parallel"]]
        cps = [r.get("throughput_cps", {}).get("mean", 0) for r in iss["parallel"]]
        wls = [r.get("wall_ms", {}).get("mean", 0) for r in iss["parallel"]]
        ax2 = ax.twinx()
        l1, = ax.plot(ns, cps, "o-", color=COLORS["par"], label="Throughput (certs/s)", zorder=3)
        l2, = ax2.plot(ns, wls, "s--", color=COLORS["seq"], alpha=0.7, label="Wall time (ms)", zorder=3)
        ax.set_xlabel("Batch Size (N)")
        ax.set_ylabel("Throughput (certs/s)", color=COLORS["par"])
        ax2.set_ylabel("Wall-clock Time (ms)", color=COLORS["seq"])
        ax.set_title("Parallel (Burst) Issuance Throughput vs N")
        ax.set_xscale("log")
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
        ax.legend(handles=[l1, l2], loc="upper left")

    fig.suptitle("Fig 1 — Certificate Issuance Performance on IC Mainnet", fontsize=13, fontweight="bold", y=1.01)
    savefig(fig, "Fig01_issuance_latency")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 2  —  Verification Latency vs N
# ═════════════════════════════════════════════════════════════════════════════

if ver:
    print("Fig 02: Verification latency …")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    ax = axes[0]
    if ver.get("sequential"):
        ns   = [r["n"] for r in ver["sequential"]]
        mns  = [r.get("mean", 0) for r in ver["sequential"]]
        p50s = [r.get("median", r.get("p50", 0)) for r in ver["sequential"]]
        p95s = [r.get("p95", 0) for r in ver["sequential"]]
        p99s = [r.get("p99", 0) for r in ver["sequential"]]
        ax.plot(ns, mns,  "o-", color=COLORS["ver"],   label="Mean")
        ax.plot(ns, p50s, "s--",color=COLORS["ver"],   alpha=0.7, label="p50")
        ax.plot(ns, p95s, "^-.",color=COLORS["par"],   alpha=0.7, label="p95")
        ax.plot(ns, p99s, "D:", color=COLORS["burst"], alpha=0.7, label="p99")
        ax.fill_between(ns, p50s, p95s, alpha=0.08, color=COLORS["ver"])
    ax.set_xscale("log")
    ax.set_xlabel("Number of Certificates Verified (N)"); ax.set_ylabel("Latency (ms)")
    ax.set_title("Sequential Verification Latency vs N\n(query calls, O(log N) Merkle proof)")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
    ax.legend()

    ax = axes[1]
    if ver.get("concurrent"):
        ns  = [r["n"] for r in ver["concurrent"]]
        qps = [r.get("throughput_qps", {}).get("mean", 0) for r in ver["concurrent"]]
        wls = [r.get("wall_ms", {}).get("mean", 0) for r in ver["concurrent"]]
        ax2 = ax.twinx()
        l1, = ax.plot(ns, qps, "o-", color=COLORS["ver"], label="Throughput (queries/s)")
        l2, = ax2.plot(ns, wls, "s--", color=COLORS["par"], alpha=0.7, label="Wall time (ms)")
        ax.set_xlabel("Concurrent Queries (N)")
        ax.set_ylabel("Throughput (queries/s)", color=COLORS["ver"])
        ax2.set_ylabel("Wall-clock Time (ms)", color=COLORS["par"])
        ax.set_title("Concurrent Verification Throughput vs N")
        ax.set_xscale("log")
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
        ax.legend(handles=[l1, l2], loc="upper left")

    fig.suptitle("Fig 2 — Certificate Verification Performance on IC Mainnet", fontsize=13, fontweight="bold", y=1.01)
    savefig(fig, "Fig02_verification_latency")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 3  —  Throughput Comparison (all operations on one chart)
# ═════════════════════════════════════════════════════════════════════════════

print("Fig 03: Throughput comparison …")
fig, ax = plt.subplots(figsize=(9, 5))

if iss and iss.get("parallel"):
    ns  = [r["n"] for r in iss["parallel"]]
    cps = [r.get("throughput_cps", {}).get("mean", 0) for r in iss["parallel"]]
    ax.plot(ns, cps, "o-", color=COLORS["seq"], label="Issuance (parallel batch)", linewidth=2)

if ver and ver.get("concurrent"):
    ns  = [r["n"] for r in ver["concurrent"]]
    qps = [r.get("throughput_qps", {}).get("mean", 0) for r in ver["concurrent"]]
    ax.plot(ns, qps, "s-", color=COLORS["ver"], label="Verification (concurrent)", linewidth=2)

if conc and conc.get("concurrent"):
    ns  = [r["c"] for r in conc["concurrent"]]
    ops = [r.get("throughput_ops", {}).get("mean", 0) for r in conc["concurrent"]]
    ax.plot(ns, ops, "^-", color=COLORS["mix"], label="Mixed workload (30% issue + 70% verify)", linewidth=2)

ax.set_xscale("log"); ax.set_yscale("log")
ax.set_xlabel("Batch Size / Concurrency Level (N)"); ax.set_ylabel("Throughput (ops/s)")
ax.set_title("Fig 3 — Operation Throughput vs Scale (IC Mainnet)")
ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: f"{v:.0f}"))
ax.legend()
savefig(fig, "Fig03_throughput_comparison")
plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 4  —  Concurrent Users vs Time & Throughput
# ═════════════════════════════════════════════════════════════════════════════

if conc and conc.get("concurrent"):
    print("Fig 04: Concurrent users …")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    cs    = [r["c"] for r in conc["concurrent"]]
    walls = [r.get("wall_ms", {}).get("mean", 0) for r in conc["concurrent"]]
    ops   = [r.get("throughput_ops", {}).get("mean", 0) for r in conc["concurrent"]]
    err_rates = []
    for r in conc["concurrent"]:
        reps = r.get("reps", [])
        if reps:
            err_rates.append(np.mean([rep.get("error_rate", 0) for rep in reps]))
        else:
            err_rates.append(0)

    ax = axes[0]
    ax.plot(cs, walls, "o-", color=COLORS["con"], label="Wall time (ms)")
    ax.set_xlabel("Simultaneous Callers (C)"); ax.set_ylabel("Wall-clock Time (ms)")
    ax.set_title("Total Wall-clock Time vs Concurrent Users")

    ax = axes[1]
    ax2 = ax.twinx()
    l1, = ax.plot(cs, ops,       "o-", color=COLORS["con"],   label="Throughput (ops/s)")
    l2, = ax2.plot(cs, [e*100 for e in err_rates], "s--", color=COLORS["burst"], alpha=0.8, label="Error rate (%)")
    ax.set_xlabel("Simultaneous Callers (C)"); ax.set_ylabel("Throughput (ops/s)", color=COLORS["con"])
    ax2.set_ylabel("Error Rate (%)", color=COLORS["burst"])
    ax2.set_ylim(0, max(max(e*100 for e in err_rates) * 1.5, 5))
    ax.set_title("Throughput & Error Rate vs Concurrent Users")
    ax.legend(handles=[l1, l2])

    fig.suptitle("Fig 4 — Concurrent Mixed Workload on IC Mainnet", fontsize=13, fontweight="bold", y=1.01)
    savefig(fig, "Fig04_concurrent_users")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 5  —  Latency CDFs
# ═════════════════════════════════════════════════════════════════════════════

print("Fig 05: Latency CDFs …")
fig, ax = plt.subplots(figsize=(9, 5))

if iss and iss.get("sequential"):
    for i, r in enumerate(iss["sequential"]):
        times = r.get("times_ms", [])
        if times:
            x, y = cdf(times)
            ax.plot(x, y*100, alpha=0.8, label=f"Issuance N={fmt_n(r['n'])}", linestyle="-")

if ver and ver.get("sequential"):
    for i, r in enumerate(ver["sequential"][:3]):   # first 3 to keep chart readable
        times = r.get("times_ms", [])
        if times:
            x, y = cdf(times)
            ax.plot(x, y*100, alpha=0.8, label=f"Verification N={fmt_n(r['n'])}", linestyle="--")

ax.axhline(y=50,  color="grey", linestyle=":", linewidth=0.8, alpha=0.6)
ax.axhline(y=95,  color="grey", linestyle=":", linewidth=0.8, alpha=0.6)
ax.axhline(y=99,  color="grey", linestyle=":", linewidth=0.8, alpha=0.6)
ax.text(ax.get_xlim()[0] if ax.get_xlim()[0] > 0 else 1, 51, "p50", fontsize=8, color="grey")
ax.text(ax.get_xlim()[0] if ax.get_xlim()[0] > 0 else 1, 96, "p95", fontsize=8, color="grey")
ax.text(ax.get_xlim()[0] if ax.get_xlim()[0] > 0 else 1, 100, "p99", fontsize=8, color="grey")

ax.set_xlabel("Latency (ms)"); ax.set_ylabel("Percentile (%)")
ax.set_title("Fig 5 — Latency CDF: Issuance vs Verification")
ax.legend(loc="lower right", fontsize=8)
ax.set_ylim(0, 100)
savefig(fig, "Fig05_latency_cdf")
plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 6  —  Merkle Tree Growth
# ═════════════════════════════════════════════════════════════════════════════

if thr and thr.get("merkle_growth"):
    print("Fig 06: Merkle tree growth …")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    mg = thr["merkle_growth"]
    db_sizes   = [r["db_size_after"] for r in mg]
    cps_vals   = [r["throughput_cps"] for r in mg]
    wall_vals  = [r["batch_wall_ms"] for r in mg]
    batch_sizes = [r["batch_size"] for r in mg]

    ax = axes[0]
    ax.plot(db_sizes, wall_vals, "o-", color=COLORS["tree"], label="Batch wall time (ms)")
    # Fit O(N log N) reference line
    x   = np.array(db_sizes, dtype=float)
    ref = x * np.log2(np.maximum(x, 2)) / x[0] * wall_vals[0] if len(x) > 1 else x
    ax.plot(db_sizes, ref, "k--", alpha=0.4, label="O(N log N) reference")
    ax.set_xlabel("Total Certs in Canister"); ax.set_ylabel("Batch Wall Time (ms)")
    ax.set_title("Merkle Tree Rebuild Time vs DB Size")
    ax.set_xscale("log")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
    ax.legend()

    ax = axes[1]
    ax.plot(db_sizes, cps_vals, "o-", color=COLORS["par"], label="Parallel batch throughput")
    ax.set_xlabel("Total Certs in Canister"); ax.set_ylabel("Throughput (certs/s)")
    ax.set_title("Parallel Issuance Throughput at Each DB Size")
    ax.set_xscale("log")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: fmt_n(int(v))))
    ax.legend()

    fig.suptitle("Fig 6 — Merkle Tree Scalability on IC Mainnet", fontsize=13, fontweight="bold", y=1.01)
    savefig(fig, "Fig06_merkle_growth")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 7  —  Latency Box Plots
# ═════════════════════════════════════════════════════════════════════════════

print("Fig 07: Latency box plots …")
fig, ax = plt.subplots(figsize=(11, 5))

box_data   = []
box_labels = []
box_colors = []

if iss and iss.get("sequential"):
    for r in iss["sequential"]:
        t = r.get("times_ms", [])
        if t:
            box_data.append(t); box_labels.append(f"Issue\nN={fmt_n(r['n'])}"); box_colors.append(COLORS["seq"])

if ver and ver.get("sequential"):
    for r in ver["sequential"][:4]:
        t = r.get("times_ms", [])
        if t:
            box_data.append(t); box_labels.append(f"Verify\nN={fmt_n(r['n'])}"); box_colors.append(COLORS["ver"])

if box_data:
    bp = ax.boxplot(box_data, labels=box_labels, patch_artist=True,
                    medianprops=dict(color="black", linewidth=2),
                    flierprops=dict(marker="o", markersize=3, alpha=0.3))
    for patch, color in zip(bp["boxes"], box_colors):
        patch.set_facecolor(color); patch.set_alpha(0.5)
    ax.set_yscale("log")
    ax.set_ylabel("Latency (ms)")
    ax.set_title("Fig 7 — Latency Distribution: Issuance vs Verification (Box Plots)")
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: f"{v:.0f}"))

savefig(fig, "Fig07_latency_boxplots")
plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 8  —  Throughput Over Time (Sustained benchmark)
# ═════════════════════════════════════════════════════════════════════════════

if thr and thr.get("sustained"):
    print("Fig 08: Throughput over time …")
    sus = thr["sustained"]
    fig, axes = plt.subplots(2, 1, figsize=(11, 7))

    # Rolling average of individual latencies over time
    ts_ms  = sus.get("timestamps_ms", [])
    lat_ms = sus.get("times_ms", [])
    if ts_ms and lat_ms:
        ts_s = [t / 1000 for t in ts_ms]
        ax   = axes[0]
        ax.scatter(ts_s, lat_ms, s=3, alpha=0.3, color=COLORS["seq"], label="Individual latency")
        # Rolling mean
        window = 20
        rolling = [np.mean(lat_ms[max(0, i-window):i+1]) for i in range(len(lat_ms))]
        ax.plot(ts_s, rolling, color=COLORS["par"], linewidth=2, label=f"Rolling mean (w={window})")
        ax.set_xlabel("Time (s)"); ax.set_ylabel("Issuance Latency (ms)")
        ax.set_title("Per-Operation Latency During 60-Second Sustained Load")
        ax.legend()

    # Throughput in 10-second windows
    windows = sus.get("throughput_windows", [])
    if windows:
        w_starts = [w["window_start_s"] for w in windows]
        w_tps    = [w["throughput_cps"] for w in windows]
        ax = axes[1]
        ax.bar(w_starts, w_tps, width=8, color=COLORS["con"], alpha=0.7, label="Certs/s per 10s window")
        ax.axhline(y=np.mean(w_tps), color=COLORS["seq"], linestyle="--", linewidth=2, label=f"Mean = {np.mean(w_tps):.2f} certs/s")
        ax.set_xlabel("Time Elapsed (s)"); ax.set_ylabel("Throughput (certs/s)")
        ax.set_title("Throughput in 10-Second Windows During Sustained Load")
        ax.legend()

    fig.suptitle("Fig 8 — Throughput Stability Over Time (60s Sustained Load)", fontsize=13, fontweight="bold")
    fig.tight_layout()
    savefig(fig, "Fig08_throughput_over_time")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 9  —  Peak Burst Analysis
# ═════════════════════════════════════════════════════════════════════════════

if thr and thr.get("peak_burst"):
    print("Fig 09: Peak burst …")
    burst = thr["peak_burst"]
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))

    # Pie: success vs failure
    ax = axes[0]
    ok  = burst.get("succeeded", 0)
    err = burst.get("failed", 0)
    ax.pie([ok, err],
           labels=[f"Succeeded\n({ok})", f"Failed\n({err})"],
           colors=[COLORS["con"], COLORS["burst"]],
           autopct="%1.1f%%", startangle=90,
           wedgeprops=dict(edgecolor="white", linewidth=2))
    ax.set_title(f"Peak Burst (1000 simultaneous calls)\nTotal wall: {burst.get('wall_ms', '?')}ms")

    # Bar: latency stats
    ax = axes[1]
    lat = burst.get("latency", {})
    keys   = ["min", "median", "mean", "p95", "p99", "max"]
    labels = ["Min", "p50", "Mean", "p95", "p99", "Max"]
    vals   = [lat.get(k, lat.get("median" if k == "median" else k, 0)) for k in keys]
    bars = ax.bar(labels, vals, color=[COLORS["con"]]*3 + [COLORS["par"]] + [COLORS["burst"]]*2, alpha=0.75)
    ax.set_ylabel("Latency (ms)"); ax.set_title("Burst Success Latency Percentiles")
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 20,
                f"{val:.0f}", ha="center", va="bottom", fontsize=8)

    fig.suptitle("Fig 9 — Peak Burst (1000 Simultaneous Calls) Analysis", fontsize=13, fontweight="bold")
    fig.tight_layout()
    savefig(fig, "Fig09_burst_analysis")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# Figure 10  —  ICP Finality Time
# ═════════════════════════════════════════════════════════════════════════════

if conc and conc.get("finality_ms"):
    print("Fig 10: ICP finality …")
    fin = conc["finality_ms"]
    samples = fin.get("samples", [])
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    ax = axes[0]
    ax.hist(samples, bins=20, color=COLORS["ver"], alpha=0.7, edgecolor="white")
    for p, lbl in [(50, "Median"), (95, "p95")]:
        v = float(np.percentile(samples, p)) if samples else 0
        ax.axvline(v, color=COLORS["burst"], linestyle="--", linewidth=1.5, label=f"{lbl}={v:.0f}ms")
    ax.set_xlabel("Time to Finality (ms)"); ax.set_ylabel("Count")
    ax.set_title("ICP Finality Time Distribution\n(submit → cert readable via query)")
    ax.legend()

    # Comparison bar chart: ICP vs other chains (reference values)
    ax = axes[1]
    chains = ["ICP\n(Measured)", "Solana\n(~400ms)", "Ethereum\n(~12s slot)", "Bitcoin\n(~60min)"]
    chain_vals = [fin.get("mean", 2000), 400, 12_000, 3_600_000]
    chain_colors = [COLORS["con"], "#9333ea", "#f59e0b", "#f97316"]
    bars = ax.bar(chains, chain_vals, color=chain_colors, alpha=0.75, edgecolor="white")
    ax.set_yscale("log")
    ax.set_ylabel("Finality Time (ms, log scale)")
    ax.set_title("Finality Time: ICP vs Other Blockchains\n(reference values)")
    for bar, val in zip(bars, chain_vals):
        ax.text(bar.get_x() + bar.get_width()/2, val*1.1,
                f"{val:.0f}ms" if val < 10000 else f"{val/1000:.0f}s",
                ha="center", va="bottom", fontsize=8, fontweight="bold")

    fig.suptitle("Fig 10 — ICP Consensus Finality Time", fontsize=13, fontweight="bold", y=1.01)
    savefig(fig, "Fig10_finality_time")
    plt.close(fig)

# ═════════════════════════════════════════════════════════════════════════════
# LaTeX Summary Table
# ═════════════════════════════════════════════════════════════════════════════

print("\nGenerating LaTeX summary table …")
tex_rows = []
tex_rows.append(r"\begin{table}[htbp]")
tex_rows.append(r"\centering")
tex_rows.append(r"\caption{ICP Academic Credential Verification — Mainnet Performance Summary}")
tex_rows.append(r"\label{tab:perf_summary}")
tex_rows.append(r"\begin{tabular}{llrrrr}")
tex_rows.append(r"\toprule")
tex_rows.append(r"Operation & Mode & N & Mean (ms) & p95 (ms) & Throughput (ops/s) \\")
tex_rows.append(r"\midrule")

if iss and iss.get("sequential"):
    for r in iss["sequential"]:
        tex_rows.append(
            f"Issuance & Sequential & {fmt_n(r['n'])} & "
            f"{r.get('mean',0):.0f} & {r.get('p95',0):.0f} & "
            f"{round(1000/max(r.get('mean',1),1),2)} \\\\"
        )

if iss and iss.get("parallel"):
    for r in iss["parallel"]:
        cps = r.get("throughput_cps", {})
        tex_rows.append(
            f"Issuance & Parallel & {fmt_n(r['n'])} & "
            f"{r.get('individual_ms',{}).get('mean',0):.0f} & "
            f"{r.get('individual_ms',{}).get('p95',0):.0f} & "
            f"{cps.get('mean',0):.1f} \\\\"
        )

tex_rows.append(r"\midrule")

if ver and ver.get("sequential"):
    for r in ver["sequential"]:
        tex_rows.append(
            f"Verification & Sequential & {fmt_n(r['n'])} & "
            f"{r.get('mean',0):.0f} & {r.get('p95',0):.0f} & "
            f"{round(1000/max(r.get('mean',1),1),2)} \\\\"
        )

if ver and ver.get("concurrent"):
    for r in ver["concurrent"]:
        qps = r.get("throughput_qps", {})
        tex_rows.append(
            f"Verification & Concurrent & {fmt_n(r['n'])} & "
            f"{r.get('individual_ms',{}).get('mean',0):.0f} & "
            f"{r.get('individual_ms',{}).get('p95',0):.0f} & "
            f"{qps.get('mean',0):.1f} \\\\"
        )

tex_rows.append(r"\bottomrule")
tex_rows.append(r"\end{tabular}")
tex_rows.append(r"\end{table}")

tex_path = FIGURES_DIR / "summary_table.tex"
tex_path.write_text("\n".join(tex_rows))
print(f"  Saved: figures/summary_table.tex")

# ═════════════════════════════════════════════════════════════════════════════
# Interactive HTML Dashboard (Plotly)
# ═════════════════════════════════════════════════════════════════════════════

if HAS_PLOTLY:
    print("Generating interactive HTML dashboard …")
    fig_html = psp.make_subplots(
        rows=3, cols=3,
        subplot_titles=[
            "Issuance: Sequential Latency vs N",
            "Issuance: Parallel Throughput vs N",
            "Verification: Concurrent Throughput vs N",
            "Throughput Comparison (all ops)",
            "Concurrent Users vs Throughput",
            "ICP Finality Distribution",
            "Merkle Tree Rebuild Time vs DB Size",
            "Throughput Over Time (60s window)",
            "Peak Burst: Error Rate vs Latency",
        ],
        horizontal_spacing=0.09, vertical_spacing=0.12,
    )

    # Row 1 Col 1: Sequential issuance
    if iss and iss.get("sequential"):
        ns   = [r["n"] for r in iss["sequential"]]
        mns  = [r.get("mean", 0) for r in iss["sequential"]]
        p95s = [r.get("p95", 0) for r in iss["sequential"]]
        fig_html.add_trace(go.Scatter(x=ns, y=mns, mode="lines+markers", name="Mean", line=dict(color=COLORS["seq"])), 1, 1)
        fig_html.add_trace(go.Scatter(x=ns, y=p95s, mode="lines+markers", name="p95", line=dict(color=COLORS["par"], dash="dash")), 1, 1)

    # Row 1 Col 2: Parallel issuance throughput
    if iss and iss.get("parallel"):
        ns  = [r["n"] for r in iss["parallel"]]
        cps = [r.get("throughput_cps", {}).get("mean", 0) for r in iss["parallel"]]
        fig_html.add_trace(go.Scatter(x=ns, y=cps, mode="lines+markers", name="Certs/s", line=dict(color=COLORS["par"])), 1, 2)

    # Row 1 Col 3: Concurrent verification throughput
    if ver and ver.get("concurrent"):
        ns  = [r["n"] for r in ver["concurrent"]]
        qps = [r.get("throughput_qps", {}).get("mean", 0) for r in ver["concurrent"]]
        fig_html.add_trace(go.Scatter(x=ns, y=qps, mode="lines+markers", name="Queries/s", line=dict(color=COLORS["ver"])), 1, 3)

    # Row 2 Col 1: Throughput comparison
    if iss and iss.get("parallel"):
        ns  = [r["n"] for r in iss["parallel"]]
        cps = [r.get("throughput_cps", {}).get("mean", 0) for r in iss["parallel"]]
        fig_html.add_trace(go.Scatter(x=ns, y=cps, mode="lines+markers", name="Issuance parallel", line=dict(color=COLORS["seq"])), 2, 1)
    if ver and ver.get("concurrent"):
        ns  = [r["n"] for r in ver["concurrent"]]
        qps = [r.get("throughput_qps", {}).get("mean", 0) for r in ver["concurrent"]]
        fig_html.add_trace(go.Scatter(x=ns, y=qps, mode="lines+markers", name="Verification concurrent", line=dict(color=COLORS["ver"])), 2, 1)

    # Row 2 Col 2: Concurrent users vs throughput
    if conc and conc.get("concurrent"):
        cs  = [r["c"] for r in conc["concurrent"]]
        ops = [r.get("throughput_ops", {}).get("mean", 0) for r in conc["concurrent"]]
        fig_html.add_trace(go.Scatter(x=cs, y=ops, mode="lines+markers", name="Mixed ops/s", line=dict(color=COLORS["mix"])), 2, 2)

    # Row 2 Col 3: Finality histogram
    if conc and conc.get("finality_ms"):
        samples = conc["finality_ms"].get("samples", [])
        if samples:
            fig_html.add_trace(go.Histogram(x=samples, nbinsx=20, name="Finality (ms)", marker_color=COLORS["ver"]), 2, 3)

    # Row 3 Col 1: Merkle tree
    if thr and thr.get("merkle_growth"):
        mg = thr["merkle_growth"]
        fig_html.add_trace(go.Scatter(
            x=[r["db_size_after"] for r in mg],
            y=[r["batch_wall_ms"] for r in mg],
            mode="lines+markers", name="Rebuild time (ms)", line=dict(color=COLORS["tree"])
        ), 3, 1)

    # Row 3 Col 2: Throughput over time
    if thr and thr.get("sustained"):
        wins = thr["sustained"].get("throughput_windows", [])
        if wins:
            fig_html.add_trace(go.Bar(
                x=[w["window_start_s"] for w in wins],
                y=[w["throughput_cps"] for w in wins],
                name="Certs/s (10s window)", marker_color=COLORS["con"]
            ), 3, 2)

    # Row 3 Col 3: Burst
    if thr and thr.get("peak_burst"):
        b = thr["peak_burst"]
        lat = b.get("latency", {})
        kvs = [("p50", lat.get("median", 0)), ("p95", lat.get("p95", 0)), ("p99", lat.get("p99", 0))]
        fig_html.add_trace(go.Bar(
            x=[k for k, _ in kvs], y=[v for _, v in kvs],
            name="Burst latency (ms)", marker_color=COLORS["burst"]
        ), 3, 3)

    fig_html.update_layout(
        height=1000, width=1400,
        title_text="<b>ICP Academic Credential Verification — Mainnet Research Benchmark Dashboard</b>",
        title_font_size=16,
        showlegend=False,
        template="plotly_white",
    )
    dash_path = FIGURES_DIR / "dashboard.html"
    fig_html.write_html(str(dash_path))
    print(f"  Saved: figures/dashboard.html")
else:
    print("  (Plotly not installed — skipping HTML dashboard. Run: pip install plotly)")

# ── Done ──────────────────────────────────────────────────────────────────────

print(f"""
==========================================
  All figures saved to: benchmarks/visualize/figures/
==========================================
  PNG + PDF : 9 publication-ready figures
  LaTeX     : figures/summary_table.tex
  HTML      : figures/dashboard.html  (if Plotly installed)

Include in your paper:
  \\input{{benchmarks/visualize/figures/summary_table}}
""")
