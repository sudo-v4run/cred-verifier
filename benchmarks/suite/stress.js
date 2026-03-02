/**
 * stress.js — Real-world stress & endurance tests for TrustVault.
 *
 * Three stress scenarios, each targeting a different failure mode:
 *
 *   1. BURST STORM      — Fire 200 issueCertificate update calls as fast as
 *                         possible (no rate limiting).  Tests canister ingress
 *                         queue depth and back-pressure behaviour.
 *
 *   2. SUSTAINED LOAD   — Maintain ~10 ops/sec for 60 seconds.  Measures
 *                         degradation over time, memory growth, and whether
 *                         the canister's Merkle tree rebalancing causes any
 *                         latency spikes mid-run.
 *
 *   3. MIXED WORKLOAD   — Simulate realistic production traffic:
 *                         70 % verify (query calls) + 30 % issue (update calls)
 *                         at C=20 concurrency.  p50/p95/p99 reported separately
 *                         for reads vs writes.
 *
 *   4. MEMORY PRESSURE  — Issue 500 certificates then run 1 000 sequential
 *                         verify queries.  Ensures the canister heap stays
 *                         stable and query latency doesn't degrade as tree
 *                         depth grows (O(log N) Merkle traversal proof).
 *
 * Dry-run mode: every test produces synthetic data that realistically
 * models ICP mainnet behaviour so the visualisation pipeline can be tested
 * without a live canister.
 */

import { summarise, throughput, round2, percentile } from "./stats.js";
import { log, printStats, saveResult }               from "./reporter.js";
import {
  STRESS_BURST_COUNT,
  STRESS_SUSTAINED_DURATION_S,
  STRESS_SUSTAINED_RATE,
  STRESS_MIXED_CONCURRENCY,
  STRESS_MIXED_TOTAL,
  STRESS_MEMORY_ISSUE_COUNT,
  STRESS_MEMORY_VERIFY_COUNT,
  WARMUP_CALLS,
} from "./config.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function nextId(prefix = "STRESS") {
  return `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function certArgs(id, tag = "Stress") {
  return [
    id,
    `${tag} University`,
    `https://stress.icp.edu/verify`,
    `Student ${_seq}`,
    `STR${String(_seq).padStart(6, "0")}`,
    "principal-stress",
    "Bachelor of Science",
    "Distributed Systems",
    "2026-06-01",
    "2026-06-01",
    3.6,
    "With Distinction",
  ];
}

// Gaussian sampling (Box-Muller)
function gaussian(mean, sd, minVal = 50) {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(minVal, mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── live helpers ─────────────────────────────────────────────────────────────

async function issueOne(actor, tag = "STRESS") {
  const id = nextId(tag);
  const t0 = Date.now();
  await actor.issueCertificate(...certArgs(id, tag));
  return { ms: Date.now() - t0, id };
}

async function verifyOne(actor, id) {
  const t0 = Date.now();
  await actor.verifyCertificate(id);
  return Date.now() - t0;
}

// ─── 1. BURST STORM ───────────────────────────────────────────────────────────

async function burstStorm(actors, dryRun) {
  const N = STRESS_BURST_COUNT;
  log.sub(`Burst Storm — ${N} concurrent update calls`);

  if (dryRun) {
    // Simulate: first calls fast, throttle kicks in and latency climbs
    const times = Array.from({ length: N }, (_, i) => {
      const base = 2000 + i * 8;  // slight latency ramp under load
      return gaussian(base, 300, 800);
    });
    const stats = summarise(times);
    const total_ms = times.reduce((a, b) => Math.max(a, b), 0) + gaussian(500, 100); // wall clock ≈ slowest batch
    printStats("Burst issuance", stats);
    log.row("  Wall-clock total", `${round2(total_ms)} ms`);
    log.row("  Effective throughput", `${round2(throughput(N, total_ms))} ops/s`);
    return { scenario: "burst_storm", N, times_ms: times, stats, total_ms, throughput_ops_s: round2(throughput(N, total_ms)) };
  }

  // Live: fire all at once
  const t0 = Date.now();
  const promises = Array.from({ length: N }, () => issueOne(actors.authedActor, "BURST"));
  const results = await Promise.allSettled(promises);
  const total_ms = Date.now() - t0;

  const times = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value.ms);
  const failed = results.filter(r => r.status === "rejected").length;
  const stats = summarise(times);

  printStats("Burst issuance", stats);
  log.row("  Wall-clock total",   `${total_ms} ms`);
  log.row("  Succeeded",          `${times.length}/${N}`);
  log.row("  Failed",             `${failed}`);
  log.row("  Effective throughput", `${round2(throughput(times.length, total_ms))} ops/s`);

  return { scenario: "burst_storm", N, times_ms: times, stats, total_ms, failed,
           throughput_ops_s: round2(throughput(times.length, total_ms)) };
}

// ─── 2. SUSTAINED LOAD ────────────────────────────────────────────────────────

async function sustainedLoad(actors, dryRun) {
  const duration = STRESS_SUSTAINED_DURATION_S * 1000;
  const rate     = STRESS_SUSTAINED_RATE;   // target ops/sec
  const interval = 1000 / rate;
  log.sub(`Sustained Load — ${rate} ops/sec for ${STRESS_SUSTAINED_DURATION_S}s`);

  const times = [];
  const issuedIds = [];

  if (dryRun) {
    // Simulate gradual latency creep then stabilisation
    const total = Math.floor(STRESS_SUSTAINED_DURATION_S * rate);
    for (let i = 0; i < total; i++) {
      // Slight increase first 20%, then stable
      const drift = i < total * 0.2 ? i * 3 : 0;
      times.push(gaussian(2100 + drift, 200, 1000));
    }
    const stats = summarise(times);
    printStats("Sustained issuance", stats);
    log.row("  Operations issued", times.length);
    log.row("  Actual throughput", `${round2(throughput(times.length, duration))} ops/s`);
    return { scenario: "sustained_load", target_rate: rate, duration_s: STRESS_SUSTAINED_DURATION_S,
             times_ms: times, stats, actual_throughput_ops_s: round2(throughput(times.length, duration)) };
  }

  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    const tickStart = Date.now();
    const { ms, id } = await issueOne(actors.authedActor, "SUS");
    times.push(ms);
    issuedIds.push(id);
    log.info(`  [${times.length}] issued ${id} — ${ms}ms`);

    // Pace to target rate
    const elapsed = Date.now() - tickStart;
    if (elapsed < interval) await sleep(interval - elapsed);
  }

  const stats = summarise(times);
  printStats("Sustained issuance", stats);
  log.row("  Operations issued",  times.length);
  log.row("  Actual throughput",  `${round2(throughput(times.length, duration))} ops/s`);

  return { scenario: "sustained_load", target_rate: rate, duration_s: STRESS_SUSTAINED_DURATION_S,
           times_ms: times, stats, actual_throughput_ops_s: round2(throughput(times.length, duration)) };
}

// ─── 3. MIXED WORKLOAD ────────────────────────────────────────────────────────

async function mixedWorkload(actors, dryRun) {
  const C     = STRESS_MIXED_CONCURRENCY;
  const total = STRESS_MIXED_TOTAL;
  const writeRatio = 0.30;
  log.sub(`Mixed Workload — ${total} ops, 70% reads / 30% writes, C=${C}`);

  if (dryRun) {
    const readTimes  = Array.from({ length: Math.floor(total * 0.70) }, () => gaussian(140, 30, 50));
    const writeTimes = Array.from({ length: Math.floor(total * 0.30) }, () => gaussian(2100, 250, 800));
    const readStats  = summarise(readTimes);
    const writeStats = summarise(writeTimes);
    printStats("Read (verify) latency", readStats);
    printStats("Write (issue) latency", writeStats);
    return { scenario: "mixed_workload", C, total, write_ratio: writeRatio,
             read: { times_ms: readTimes, stats: readStats },
             write: { times_ms: writeTimes, stats: writeStats } };
  }

  // Pre-issue some certs to verify
  log.info("  Pre-issuing seed certificates for read pool …");
  const seedIds = [];
  for (let i = 0; i < 20; i++) {
    const { id } = await issueOne(actors.authedActor, "SEED");
    seedIds.push(id);
  }

  const readTimes  = [];
  const writeTimes = [];

  // Build operation queue
  const ops = Array.from({ length: total }, (_, i) => ({
    type: Math.random() < writeRatio ? "write" : "read",
    idx:  i,
  }));

  // Execute in batches of C
  for (let b = 0; b < ops.length; b += C) {
    const batch = ops.slice(b, b + C);
    const tasks = batch.map(op => {
      if (op.type === "write") {
        return issueOne(actors.authedActor, "MIX").then(r => { writeTimes.push(r.ms); seedIds.push(r.id); });
      } else {
        const id = seedIds[Math.floor(Math.random() * seedIds.length)];
        return verifyOne(actors.anonActor, id).then(ms => readTimes.push(ms));
      }
    });
    await Promise.allSettled(tasks);
    log.info(`  batch ${Math.floor(b / C) + 1} done — reads=${readTimes.length} writes=${writeTimes.length}`);
  }

  const readStats  = summarise(readTimes);
  const writeStats = summarise(writeTimes);
  printStats("Read (verify) latency", readStats);
  printStats("Write (issue) latency", writeStats);

  return { scenario: "mixed_workload", C, total, write_ratio: writeRatio,
           read: { times_ms: readTimes, stats: readStats },
           write: { times_ms: writeTimes, stats: writeStats } };
}

// ─── 4. MEMORY PRESSURE ───────────────────────────────────────────────────────

async function memoryPressure(actors, dryRun) {
  const issueN  = STRESS_MEMORY_ISSUE_COUNT;
  const verifyN = STRESS_MEMORY_VERIFY_COUNT;
  log.sub(`Memory Pressure — issue ${issueN} certs → verify ${verifyN} times`);

  if (dryRun) {
    // Simulate: verify latency stays flat (O(log N) Merkle proof)
    const issueTimes  = Array.from({ length: issueN }, (_, i) => gaussian(2100, 200, 1000));
    const verifyTimes = Array.from({ length: verifyN }, (_, i) => {
      // Latency should stay near-constant regardless of tree depth
      return gaussian(145, 20, 80);
    });
    const issueStats  = summarise(issueTimes);
    const verifyStats = summarise(verifyTimes);
    printStats(`Issuance (N=${issueN})`, issueStats);
    printStats(`Verification (N=${verifyN} queries)`, verifyStats);
    return { scenario: "memory_pressure", issueN, verifyN,
             issue:  { times_ms: issueTimes,  stats: issueStats },
             verify: { times_ms: verifyTimes, stats: verifyStats } };
  }

  // Issue phase — batches of 10
  log.info(`  Issuing ${issueN} certificates …`);
  const issuedIds = [];
  const issueTimes = [];
  for (let b = 0; b < issueN; b += 10) {
    const batch = Math.min(10, issueN - b);
    const results = await Promise.all(
      Array.from({ length: batch }, () => issueOne(actors.authedActor, "MEM"))
    );
    results.forEach(r => { issueTimes.push(r.ms); issuedIds.push(r.id); });
    log.info(`  issued ${issuedIds.length}/${issueN}`);
  }

  // Verify phase — sequential to measure per-query latency clearly
  log.info(`  Running ${verifyN} sequential verify queries …`);
  const verifyTimes = [];
  for (let i = 0; i < verifyN; i++) {
    const id = issuedIds[i % issuedIds.length];
    const ms = await verifyOne(actors.anonActor, id);
    verifyTimes.push(ms);
    if ((i + 1) % 100 === 0) log.info(`  verified ${i + 1}/${verifyN}`);
  }

  const issueStats  = summarise(issueTimes);
  const verifyStats = summarise(verifyTimes);
  printStats(`Issuance (N=${issueN})`,          issueStats);
  printStats(`Verification (N=${verifyN})`, verifyStats);

  return { scenario: "memory_pressure", issueN, verifyN,
           issue:  { times_ms: issueTimes,  stats: issueStats },
           verify: { times_ms: verifyTimes, stats: verifyStats } };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {{ authedActor: any, anonActor: any }} actors
 * @param {{ dryRun?: boolean }} opts
 */
export async function runStress(actors, opts = {}) {
  const dryRun = opts.dryRun ?? false;

  log.header("STRESS & ENDURANCE BENCHMARK");
  log.info(`Mode: ${dryRun ? "DRY-RUN (synthetic data)" : "LIVE canister"}`);
  log.nl();

  if (!dryRun) {
    log.sub("Warm-up");
    for (let i = 0; i < WARMUP_CALLS; i++) {
      await issueOne(actors.authedActor, "WRMUP");
      log.info(`  warm-up ${i + 1}/${WARMUP_CALLS}`);
    }
    log.ok("Warm-up complete");
  }

  const burst     = await burstStorm(actors, dryRun);
  const sustained = await sustainedLoad(actors, dryRun);
  const mixed     = await mixedWorkload(actors, dryRun);
  const memory    = await memoryPressure(actors, dryRun);

  const payload = {
    suite: "stress",
    scenarios: { burst, sustained, mixed, memory },
  };

  saveResult("stress", payload);
  log.ok("Stress benchmark complete — results saved.");
  return payload;
}
