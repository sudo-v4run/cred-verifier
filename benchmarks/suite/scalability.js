/**
 * scalability.js  —  Certificate Issuance Benchmark
 * Exported as: runIssuance
 *
 * Measures issuance latency and throughput as the number of certificates N
 * grows from 1 to 10,000 on IC mainnet.
 *
 * Two modes per N:
 *   • Sequential  — certs issued one-at-a-time; captures single-call latency
 *                   and how per-call time changes as the Merkle tree grows.
 *   • Parallel    — all N certs sent simultaneously; captures wall-clock
 *                   "burst" time and effective throughput (certs/s).
 *
 * Result JSON (saved to results/issuance_<timestamp>.json):
 *   {
 *     suite: "issuance",
 *     sequential: [ { n, times_ms, mean, median, p95, p99, min, max } ],
 *     parallel:   [ { n, wall_ms, throughput_cps, individual_ms } ]
 *   }
 */

import { summarise, round2 }                     from "./stats.js";
import { log, printStats, saveResult, saveLive } from "./reporter.js";
import {
  ISSUANCE_SEQ_SCALES,
  PARALLEL_SCALES,
  WARMUP_CALLS,
  REPEAT_PER_N,
  SUITE_META,
} from "./config.js";

// ── helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (prefix = "ISS") =>
  `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const certArgs = (id, uni = "Benchmark University ICP") => [
  id, uni,
  `https://benchmark.icp.app/#/verify/benchmark-university-icp/2026/${id}`,
  `Test Student ${_seq}`,
  `STU${String(_seq).padStart(6, "0")}`,
  "anonymous",
  "Bachelor of Science",
  "Computer Science",
  "2026-06-01", "2026-06-01",
  3.5, "Magna Cum Laude",
];

const issueOne = async (actor, id) => {
  const t0 = Date.now();
  await actor.issueCertificate(...certArgs(id));
  return Date.now() - t0;
};

const verifyOne = async (actor, id) => {
  const t0 = Date.now();
  await actor.verifyCertificate(id);
  return Date.now() - t0;
};

// ── main benchmark ────────────────────────────────────────────────────────────

export async function runIssuance({ authedActor, anonActor }) {
  log.header("ISSUANCE BENCHMARK");
  log.info(`Sequential N values : ${ISSUANCE_SEQ_SCALES.join(", ")}`);
  log.info(`Parallel N values   : ${PARALLEL_SCALES.join(", ")}`);

  // ── Warm-up ─────────────────────────────────────────────────────────────
  log.sub("Warm-up (priming IC routing caches) ...");
  for (let i = 0; i < WARMUP_CALLS; i++) {
    const id = nextId("WU");
    await issueOne(authedActor, id);
    await verifyOne(anonActor, id);
  }
  log.ok(`Warm-up complete (${WARMUP_CALLS} calls)`);

  const seqResults = [];
  const parResults = [];

  // ── Parallel (burst) issuance — runs FIRST ──────────────────────────────
  log.sub("Parallel (burst) issuance -- all N certs fired simultaneously");
  for (const N of PARALLEL_SCALES) {
    log.info(`  N = ${N.toLocaleString()} (${REPEAT_PER_N} repeat(s)) ...`);
    const repWalls        = [];
    const repThroughputs  = [];
    let   lastIndividual  = [];

    for (let rep = 0; rep < REPEAT_PER_N; rep++) {
      const ids  = Array.from({ length: N }, () => nextId("PAR"));
      const t0   = Date.now();
      // Wrap each call: a rejected ingress returns -1 instead of crashing the suite
      const times = await Promise.all(ids.map(async id => {
        try { return await issueOne(authedActor, id); }
        catch { return -1; }
      }));
      const wall     = Date.now() - t0;
      const okTimes  = times.filter(t => t >= 0);
      const errCount = times.length - okTimes.length;
      if (errCount > 0) log.info(`    rep ${rep + 1}/${REPEAT_PER_N}: ${errCount} call(s) rejected by IC ingress`);
      repWalls.push(wall);
      repThroughputs.push(round2((okTimes.length / wall) * 1000));
      lastIndividual = okTimes.length > 0 ? okTimes : [0];
      log.info(`    rep ${rep + 1}/${REPEAT_PER_N}: wall=${wall}ms, ${round2((okTimes.length/wall)*1000)} certs/s (${okTimes.length}/${N} ok)`);
    }

    const wallStats = summarise(repWalls);
    parResults.push({
      n:              N,
      wall_ms:        wallStats,
      throughput_cps: summarise(repThroughputs),
      individual_ms:  summarise(lastIndividual),
    });
    log.ok(`  N=${N.toLocaleString()}: mean wall=${wallStats.mean}ms, mean ${summarise(repThroughputs).mean} certs/s`);
    // ── checkpoint: persist after every N so a crash doesn't lose data ──
    saveLive("issuance", { parallel: parResults, sequential: seqResults });
  }

  // ── Sequential issuance — runs LAST ──────────────────────────────────────
  log.sub("Sequential issuance -- one cert at a time (running last)");
  for (const N of ISSUANCE_SEQ_SCALES) {
    log.info(`  N = ${N.toLocaleString()} (${REPEAT_PER_N} repeat(s)) ...`);
    const allTimes = [];
    for (let rep = 0; rep < REPEAT_PER_N; rep++) {
      for (let i = 0; i < N; i++) {
        const ms = await issueOne(authedActor, nextId("SEQ"));
        allTimes.push(ms);
        process.stdout.write(`\r    rep ${rep + 1}/${REPEAT_PER_N}, cert ${i + 1}/${N}`);
      }
    }
    console.log();
    const stats = summarise(allTimes);
    seqResults.push({ n: N, times_ms: allTimes, ...stats });
    printStats(`Sequential N=${N}`, stats);
    // ── checkpoint ──
    saveLive("issuance", { parallel: parResults, sequential: seqResults });
  }

  const payload = {
    suite:      "issuance",
    ts:         new Date().toISOString(),
    meta:       SUITE_META,
    parallel:   parResults,
    sequential: seqResults,
  };

  const file = saveResult("issuance", payload);
  log.ok(`Issuance results saved to: ${file}`);
  return payload;
}
