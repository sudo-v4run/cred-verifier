/**
 * finality.js  --  Concurrent Mixed Workload Benchmark
 * Exported as: runConcurrent
 *
 * Simulates real-world load where multiple universities are issuing
 * certificates while verifiers are simultaneously querying them.
 *
 * For C concurrent callers:
 *   - 30% issue (update calls)  -- universities issuing certificates
 *   - 70% verify (query calls)  -- employers / institutions verifying
 *
 * Metrics captured per concurrency level C:
 *   - Total wall-clock time for all operations
 *   - Effective throughput (mixed ops/s)
 *   - Separate latency distributions for issuance vs verification
 *   - Error/timeout rate (measures IC ingress queue behaviour)
 *
 * Also measures ICP finality time:
 *   - Time from submitting an issueCertificate call
 *     to the cert being readable via verifyCertificate
 *
 * Result JSON: results/concurrent_<timestamp>.json
 */

import { summarise, round2 }                     from "./stats.js";
import { log, printStats, saveResult, saveLive } from "./reporter.js";
import {
  CONCURRENCY_LEVELS,
  WARMUP_CALLS,
  REPEAT_PER_N,
  SUITE_META,
} from "./config.js";

// ── helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (prefix = "CON") =>
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

// ── main benchmark ────────────────────────────────────────────────────────────

export async function runConcurrent({ authedActor, anonActor }) {
  log.header("CONCURRENT MIXED WORKLOAD BENCHMARK");
  log.info(`Concurrency levels: ${CONCURRENCY_LEVELS.join(", ")}`);
  log.info("Mix: 30% isssuance (update) + 70% verification (query)");

  // ── Seed existing certs for verifiers to query ──────────────────────────
  // 100 is sufficient to give verifiers in C=50 a diverse pool to query.
  const SEED_COUNT = 100;
  log.sub(`Seeding ${SEED_COUNT} certificates for verifiers to query ...`);
  const seedIds = [];
  const seedBatch = 25;
  for (let i = 0; i < SEED_COUNT; i += seedBatch) {
    const ids = Array.from({ length: seedBatch }, () => nextId("SEED"));
    const results = await Promise.all(ids.map(async id => {
      try {
        await authedActor.issueCertificate(...makeCertArgs(id));
        return id;
      } catch { return null; }
    }));
    seedIds.push(...results.filter(Boolean));
    process.stdout.write(`\r  Seeded ${seedIds.length}/${SEED_COUNT}`);
  }
  console.log();
  log.ok(`Seed complete (${seedIds.length} certs)`);

  if (seedIds.length === 0) {
    log.err("Seed produced 0 certificates — aborting concurrent suite.");
    log.err("Most likely cause: canister is out of cycles. Top up and re-run.");
    return;
  }

  // ── Warm-up ─────────────────────────────────────────────────────────────
  log.sub("Warm-up ...");
  for (let i = 0; i < WARMUP_CALLS; i++) {
    await anonActor.verifyCertificate(seedIds[i % seedIds.length]);
  }
  log.ok("Warm-up complete");

  const concResults  = [];
  const finalityData = [];

  // ── ICP finality measurement ─────────────────────────────────────────────
  // 20 samples gives a solid mean ± stddev + p95 for a research paper table.
  // At ~2 s/call on mainnet this takes ~40 s total.
  const FINALITY_SAMPLES = 20;
  log.sub(`ICP finality measurement (${FINALITY_SAMPLES} samples) ...`);
  log.info("  Measures: submit issueCertificate -> cert readable via verifyCertificate");
  for (let i = 0; i < FINALITY_SAMPLES; i++) {
    const id = nextId("FIN");
    const t0 = Date.now();
    try {
      await authedActor.issueCertificate(...makeCertArgs(id));
    } catch (e) {
      log.info(`  sample ${i + 1}: issuance rejected (${e.message ?? e}), skipping`);
      continue;
    }
    // Poll until the cert is verifiable (confirm finality)
    let readable = false;
    const pollDeadline = Date.now() + 30_000; // 30 s max poll
    while (!readable && Date.now() < pollDeadline) {
      const result = await anonActor.verifyCertificate(id);
      if (result.is_valid) {
        readable = true;
      } else {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    if (!readable) { log.info(`  sample ${i + 1}: cert not readable within 30 s, skipping`); continue; }
    const finalityMs = Date.now() - t0;
    finalityData.push(finalityMs);
    process.stdout.write(`\r  sample ${i + 1}/${FINALITY_SAMPLES}: ${finalityMs}ms`);
  }
  console.log();
  const finalityStats = summarise(finalityData);
  printStats("ICP Finality (submit->readable)", finalityStats);
  saveLive("concurrent", { finality_ms: { samples: finalityData, ...finalityStats }, concurrent: concResults });

  // ── Concurrent mixed workload ────────────────────────────────────────────
  for (const C of CONCURRENCY_LEVELS) {
    log.sub(`Concurrency C = ${C} simultaneous callers`);

    const issueCount = Math.ceil(C * 0.30);   // 30% issuance
    const verifyCount = C - issueCount;        // 70% verification
    log.info(`  ${issueCount} issuance + ${verifyCount} verification calls`);

    const repResults = [];
    for (let rep = 0; rep < REPEAT_PER_N; rep++) {
      const issueIds  = Array.from({ length: issueCount }, () => nextId("MIX"));
      const verifyIds = Array.from({ length: verifyCount }, () =>
        seedIds[Math.floor(Math.random() * seedIds.length)]
      );

      const t0 = Date.now();

      const [issueTimes, verifyTimes] = await Promise.all([
        Promise.all(issueIds.map(async id => {
          const t = Date.now();
          try { await authedActor.issueCertificate(...makeCertArgs(id)); return Date.now() - t; }
          catch { return -1; }
        })),
        Promise.all(verifyIds.map(async id => {
          const t = Date.now();
          try { await anonActor.verifyCertificate(id); return Date.now() - t; }
          catch { return -1; }
        })),
      ]);

      const wall        = Date.now() - t0;
      const totalOps    = C;
      const errors      = [...issueTimes, ...verifyTimes].filter(t => t < 0).length;
      const successOps  = totalOps - errors;

      repResults.push({
        wall_ms:       wall,
        throughput_ops: round2((successOps / wall) * 1000),
        issuance_ms:   summarise(issueTimes.filter(t => t >= 0)),
        verification_ms: summarise(verifyTimes.filter(t => t >= 0)),
        error_count:   errors,
        error_rate:    round2(errors / totalOps),
      });
    }

    const walls      = repResults.map(r => r.wall_ms);
    const throughputs = repResults.map(r => r.throughput_ops);
    concResults.push({
      c:               C,
      issueCount,
      verifyCount,
      reps:            repResults,
      wall_ms:         summarise(walls),
      throughput_ops:  summarise(throughputs),
    });
    log.ok(`  C=${C}: mean wall=${summarise(walls).mean}ms, ${summarise(throughputs).mean} ops/s`);
    saveLive("concurrent", { finality_ms: { samples: finalityData, ...finalityStats }, concurrent: concResults });
  }

  const payload = {
    suite:       "concurrent",
    ts:          new Date().toISOString(),
    meta:        SUITE_META,
    finality_ms: { samples: finalityData, ...finalityStats },
    concurrent:  concResults,
  };

  const file = saveResult("concurrent", payload);
  log.ok(`Concurrent results saved to: ${file}`);
  return payload;
}
