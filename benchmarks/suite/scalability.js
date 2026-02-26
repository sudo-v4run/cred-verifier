/**
 * scalability.js — Scalability benchmark.
 *
 * Measures how issuance and verification performance behaves as the
 * number of certificates N grows: 1 → 10 → 50 → 100.
 *
 * For each N we capture:
 *   • Sequential issuance  — individual latency of each update call
 *   • Parallel issuance    — N calls fired simultaneously; total + throughput
 *   • Sequential query verification — individual latency of each query call
 *   • Parallel query verification  — N calls fired simultaneously
 *   • Server-side Merkle proof time (from canister PerformanceMetrics)
 *
 * Dry-run mode generates realistic synthetic data so the visualisation
 * pipeline can be tested without a live canister.
 */

import { summarise, throughput, round2 } from "./stats.js";
import { log, printStats, saveResult }    from "./reporter.js";
import { SCALABILITY_N, WARMUP_CALLS }    from "./config.js";

// ─── Certificate data helpers ──────────────────────────────────────────────

let _seq = 0;
function nextId(prefix = "SCALE") {
  return `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 7)}`;
}

function certArgs(id, uni = "Benchmark University ICP") {
  return [
    id,
    uni,
    "https://benchmark.icp.edu/verify",
    `Student ${_seq}`,
    `STU${String(_seq).padStart(6, "0")}`,
    "principal-benchmark",
    "Bachelor of Science",
    "Computer Science",
    "2026-06-01",
    "2026-06-01",
    3.5,
    "Magna Cum Laude",
  ];
}

// ─── Synthetic data for dry-run ────────────────────────────────────────────

function gaussian(mean, sd) {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(50, mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

function syntheticIssuanceBatch(N) {
  return Array.from({ length: N }, () => gaussian(2100, 200));
}
function syntheticQueryBatch(N) {
  return Array.from({ length: N }, () => gaussian(140, 25));
}

// ─── Real canister helpers ─────────────────────────────────────────────────

async function issueOne(actor, id) {
  const t0 = Date.now();
  await actor.issueCertificate(...certArgs(id));
  return Date.now() - t0;
}

async function verifyOne(actor, id) {
  const t0 = Date.now();
  await actor.verifyCertificate(id);
  return Date.now() - t0;
}

// ─── Main benchmark ────────────────────────────────────────────────────────

/**
 * @param {{ authedActor: any, anonActor: any }} actors
 * @param {{ dryRun?: boolean }} opts
 */
export async function runScalability(actors, opts = {}) {
  const { authedActor, anonActor } = actors;
  const dryRun = opts.dryRun ?? false;

  log.header("SCALABILITY BENCHMARK");
  log.info(`Mode: ${dryRun ? "DRY-RUN (synthetic data)" : "LIVE canister"}`);
  log.info(`N values: ${SCALABILITY_N.join(", ")}`);

  // ── Warm-up (skip in dry-run) ──────────────────────────────────────────
  if (!dryRun) {
    log.sub("Warm-up");
    for (let i = 0; i < WARMUP_CALLS; i++) {
      const id = nextId("WARMUP");
      await issueOne(authedActor, id);
      await anonActor.verifyCertificate(id);
      log.info(`  warm-up ${i + 1}/${WARMUP_CALLS} done`);
    }
    log.ok("Warm-up complete");
  }

  const results = [];

  for (const N of SCALABILITY_N) {
    log.sub(`N = ${N}`);

    // ── Sequential issuance ──────────────────────────────────────────────
    log.info("Sequential issuance …");
    let seqIssueTimes;
    const issuedIds = [];

    if (dryRun) {
      seqIssueTimes = syntheticIssuanceBatch(N);
      for (let i = 0; i < N; i++) issuedIds.push(nextId("DR"));
    } else {
      seqIssueTimes = [];
      for (let i = 0; i < N; i++) {
        const id = nextId();
        const ms = await issueOne(authedActor, id);
        issuedIds.push(id);
        seqIssueTimes.push(ms);
        process.stdout.write(`\r    issued ${i + 1}/${N}`);
      }
      console.log();
    }
    const seqIssueStats = summarise(seqIssueTimes);
    const seqIssueThroughput = throughput(N, seqIssueTimes.reduce((a, b) => a + b, 0));
    printStats("Sequential issuance stats", seqIssueStats);
    log.row("throughput (ops/s)", seqIssueThroughput);

    // ── Parallel issuance ────────────────────────────────────────────────
    log.info(`Parallel issuance (${N} simultaneous) …`);
    let parIssueTotal;
    let parIssueTimes;
    const parIds = [];

    if (dryRun) {
      parIssueTimes = syntheticIssuanceBatch(N);
      parIssueTotal = Math.max(...parIssueTimes) + gaussian(50, 10);
      for (let i = 0; i < N; i++) parIds.push(nextId("DP"));
    } else {
      const t0 = Date.now();
      const promises = Array.from({ length: N }, () => {
        const id = nextId("PAR");
        parIds.push(id);
        return issueOne(authedActor, id).then(ms => ms);
      });
      parIssueTimes = await Promise.all(promises);
      parIssueTotal = Date.now() - t0;
    }
    const parIssueStats = summarise(parIssueTimes);
    const parIssueThroughput = throughput(N, parIssueTotal);
    printStats("Parallel issuance individual latencies", parIssueStats);
    log.row("wall-clock total (ms)", round2(parIssueTotal));
    log.row("throughput (ops/s)",    parIssueThroughput);

    // ── Collect all IDs (sequential + parallel) ──────────────────────────
    const allIds = [...issuedIds, ...parIds];

    // ── Sequential query verification ────────────────────────────────────
    log.info("Sequential query verification …");
    let seqVerifyTimes;

    if (dryRun) {
      seqVerifyTimes = syntheticQueryBatch(allIds.length);
    } else {
      seqVerifyTimes = [];
      for (let i = 0; i < allIds.length; i++) {
        const ms = await verifyOne(anonActor, allIds[i]);
        seqVerifyTimes.push(ms);
        process.stdout.write(`\r    verified ${i + 1}/${allIds.length}`);
      }
      console.log();
    }
    const seqVerifyStats = summarise(seqVerifyTimes);
    printStats("Sequential query verification stats", seqVerifyStats);

    // ── Parallel query verification ──────────────────────────────────────
    log.info(`Parallel query verification (${allIds.length} simultaneous) …`);
    let parVerifyTotal;
    let parVerifyTimes;

    if (dryRun) {
      parVerifyTimes = syntheticQueryBatch(allIds.length);
      parVerifyTotal = Math.max(...parVerifyTimes) + gaussian(20, 5);
    } else {
      const t0 = Date.now();
      parVerifyTimes = await Promise.all(
        allIds.map(id => verifyOne(anonActor, id))
      );
      parVerifyTotal = Date.now() - t0;
    }
    const parVerifyStats = summarise(parVerifyTimes);
    const parVerifyThroughput = throughput(allIds.length, parVerifyTotal);
    printStats("Parallel query verification individual latencies", parVerifyStats);
    log.row("wall-clock total (ms)", round2(parVerifyTotal));
    log.row("throughput (ops/s)",    parVerifyThroughput);

    // ── Server-side Merkle proof time ─────────────────────────────────────
    let serverMerkleUs = null;
    if (!dryRun) {
      try {
        const snap = await anonActor.getPerformanceSnapshot();
        serverMerkleUs = Number(snap.avgVerificationTimeUs);
        log.row("server avg verification (µs)", round2(serverMerkleUs));
      } catch (_) { /* canister may not have any verification data yet */ }
    } else {
      // O(log n) synthetic server timing
      serverMerkleUs = round2(50 * Math.log2(Math.max(2, allIds.length)) + gaussian(20, 5));
      log.row("server avg verification (µs) [synthetic]", serverMerkleUs);
    }

    results.push({
      N,
      totalCertsIssued:     allIds.length,
      sequentialIssuance:   { times_ms: seqIssueTimes,   stats: seqIssueStats,   throughput_ops_s: seqIssueThroughput },
      parallelIssuance:     { times_ms: parIssueTimes,   stats: parIssueStats,   throughput_ops_s: parIssueThroughput,  total_ms: round2(parIssueTotal) },
      sequentialVerification: { times_ms: seqVerifyTimes, stats: seqVerifyStats },
      parallelVerification:   { times_ms: parVerifyTimes, stats: parVerifyStats, throughput_ops_s: parVerifyThroughput, total_ms: round2(parVerifyTotal) },
      serverMerkleProofUs:  serverMerkleUs,
    });
  }

  log.header("SCALABILITY — SUMMARY TABLE");
  console.log(
    "  " +
    "N".padEnd(6) +
    "seqIssue p50(ms)".padEnd(22) +
    "parIssue ops/s".padEnd(20) +
    "seqVerify p50(ms)".padEnd(22) +
    "parVerify ops/s"
  );
  for (const r of results) {
    console.log(
      "  " +
      String(r.N).padEnd(6) +
      String(r.sequentialIssuance.stats.p50).padEnd(22) +
      String(r.parallelIssuance.throughput_ops_s).padEnd(20) +
      String(r.sequentialVerification.stats.p50).padEnd(22) +
      String(r.parallelVerification.throughput_ops_s)
    );
  }

  const file = saveResult("scalability", { results });
  return { results, file };
}
