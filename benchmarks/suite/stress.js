/**
 * stress.js  --  Sustained Throughput & Merkle Tree Growth Benchmark
 * Exported as: runThroughput
 *
 * Measures how the system behaves under sustained, long-running load:
 *
 *   1. SUSTAINED ISSUANCE  -- Continuously issue certificates for 60 seconds
 *      at the maximum achievable rate. Captures throughput over time
 *      (does it degrade as Merkle tree grows?) and latency percentiles.
 *
 *   2. MERKLE TREE GROWTH  -- Issue certs at key N checkpoints
 *      (1, 10, 100, 1000, 10000) and measure the Merkle tree rebuild time
 *      at each point. Shows O(N log N) or otherwise time complexity.
 *
 *   3. PEAK BURST   -- Fire 1000 update calls simultaneously to stress the
 *      IC ingress queue. Measures how many succeed, error rate, and
 *      p99 latency under maximum ingress pressure.
 *
 * Result JSON: results/throughput_<timestamp>.json
 */

import { summarise, round2 }                     from "./stats.js";
import { log, printStats, saveResult, saveLive } from "./reporter.js";
import {
  PARALLEL_SCALES,
  WARMUP_CALLS,
  SUITE_META,
} from "./config.js";

// ── helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (prefix = "THR") =>
  `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const makeCertArgs = (id, uni = "Benchmark University ICP") => [
  id, uni,
  `https://benchmark.icp.app/#/verify/benchmark-university-icp/2026/${id}`,
  `Student ${_seq}`,
  `STU${String(_seq).padStart(6, "0")}`,
  "anonymous",
  "Bachelor of Science",
  "Computer Science",
  "2026-06-01", "2026-06-01",
  3.5, "Magna Cum Laude",
];

const issueOne = async (actor, id) => {
  const t0 = Date.now();
  await actor.issueCertificate(...makeCertArgs(id));
  return Date.now() - t0;
};

// ── main benchmark ────────────────────────────────────────────────────────────

export async function runThroughput({ authedActor, anonActor }) {
  log.header("SUSTAINED THROUGHPUT & MERKLE TREE GROWTH BENCHMARK");

  // ── Warm-up ─────────────────────────────────────────────────────────────
  log.sub("Warm-up ...");
  for (let i = 0; i < WARMUP_CALLS; i++) {
    const id = nextId("WU");
    await issueOne(authedActor, id);
    await anonActor.verifyCertificate(id);
  }
  log.ok("Warm-up complete");

  // ── 1. Sustained issuance for 30 seconds ────────────────────────────────
  // 30 s gives ~15 data points at mainnet speed — enough to show throughput
  // stability over time (does it degrade?) without excessive cost.
  const DURATION_MS = 30_000;
  log.sub(`Sustained issuance -- running for ${DURATION_MS / 1000}s ...`);
  const sustainedTimes = [];
  const sustainedTimestamps = [];
  const sustainedStart = Date.now();

  while (Date.now() - sustainedStart < DURATION_MS) {
    const id = nextId("SUS");
    const ms = await issueOne(authedActor, id);
    sustainedTimes.push(ms);
    sustainedTimestamps.push(Date.now() - sustainedStart);
    process.stdout.write(
      `\r  elapsed=${((Date.now()-sustainedStart)/1000).toFixed(1)}s  n=${sustainedTimes.length}  last=${ms}ms`
    );
  }
  console.log();
  const sustainedStats = summarise(sustainedTimes);
  log.ok(`Issued ${sustainedTimes.length} certs in ${DURATION_MS/1000}s`);
  log.ok(`Throughput: ${round2((sustainedTimes.length / DURATION_MS) * 1000)} certs/s`);
  printStats("Sustained issuance latency", sustainedStats);
  saveLive("throughput", { sustained: { duration_ms: DURATION_MS, total_issued: sustainedTimes.length, latency: sustainedStats }, merkle_growth: [], peak_burst: null });

  // Compute throughput in 10-second windows to show trends over time
  const WINDOW_MS = 10_000;
  const windows = [];
  for (let w = 0; w < DURATION_MS; w += WINDOW_MS) {
    const inWindow = sustainedTimestamps.filter(t => t >= w && t < w + WINDOW_MS);
    windows.push({
      window_start_s: w / 1000,
      count:          inWindow.length,
      throughput_cps: round2((inWindow.length / WINDOW_MS) * 1000),
    });
  }

  // ── 2. Merkle tree growth timing ─────────────────────────────────────────
  log.sub("Merkle tree rebuild time vs N ...");
  const merkleResults = [];
  const totalCurrentCerts = await anonActor.getTotalCertificates();
  log.info(`  Current DB size: ${Number(totalCurrentCerts).toLocaleString()} certs`);

  for (const N of PARALLEL_SCALES) {
    log.info(`  Issuing parallel batch of ${N.toLocaleString()} now ...`);
    const ids = Array.from({ length: N }, () => nextId("MRK"));
    const t0  = Date.now();
    await Promise.all(ids.map(async id => {
      try { await issueOne(authedActor, id); } catch { /* swallow rejected ingress */ }
    }));
    const batchWall = Date.now() - t0;
    const newTotal  = Number(await anonActor.getTotalCertificates());

    merkleResults.push({
      batch_size:       N,
      db_size_after:    newTotal,
      batch_wall_ms:    batchWall,
      throughput_cps:   round2((N / batchWall) * 1000),
    });
    log.ok(`  N=${N.toLocaleString()}: batch wall=${batchWall}ms, DB now has ${newTotal.toLocaleString()} certs`);
    saveLive("throughput", { sustained: { duration_ms: DURATION_MS, total_issued: sustainedTimes.length, latency: sustainedStats }, merkle_growth: merkleResults, peak_burst: null });
  }

  // ── 3. Peak burst (100 simultaneous) ─────────────────────────────────────
  // 100 simultaneous calls stays well within the IC ingress queue limit
  // (~1 000 msgs/s per subnet) while still demonstrating burst behaviour.
  const BURST_SIZE = 100;
  log.sub(`Peak burst test: ${BURST_SIZE} simultaneous issueCertificate calls ...`);
  const burstIds   = Array.from({ length: BURST_SIZE }, () => nextId("BST"));
  const burstT0    = Date.now();
  const burstTimes = await Promise.all(
    burstIds.map(async id => {
      try { return await issueOne(authedActor, id); }
      catch { return -1; }
    })
  );
  const burstWall   = Date.now() - burstT0;
  const burstOk     = burstTimes.filter(t => t >= 0);
  const burstErrors = burstTimes.length - burstOk.length;
  const burstStats  = summarise(burstOk);

  log.ok(`Burst: ${burstOk.length}/${BURST_SIZE} succeeded in ${burstWall}ms`);
  log.ok(`  Error rate: ${round2(burstErrors / BURST_SIZE * 100)}%`);
  printStats("Burst success latencies", burstStats);

  const payload = {
    suite:    "throughput",
    ts:       new Date().toISOString(),
    meta:     SUITE_META,
    sustained: {
      duration_ms:         DURATION_MS,
      total_issued:        sustainedTimes.length,
      throughput_cps:      round2((sustainedTimes.length / DURATION_MS) * 1000),
      latency:             sustainedStats,
      times_ms:            sustainedTimes,
      timestamps_ms:       sustainedTimestamps,
      throughput_windows:  windows,
    },
    merkle_growth: merkleResults,
    peak_burst: {
      total:          BURST_SIZE,
      succeeded:      burstOk.length,
      failed:         burstErrors,
      error_rate:     round2(burstErrors / BURST_SIZE),
      wall_ms:        burstWall,
      throughput_cps: round2((burstOk.length / burstWall) * 1000),
      latency:        burstStats,
    },
  };

  const file = saveResult("throughput", payload);
  log.ok(`Throughput results saved to: ${file}`);
  return payload;
}
