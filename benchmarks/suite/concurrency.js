/**
 * concurrency.js  --  Certificate Verification Benchmark
 * Exported as: runVerification
 *
 * Measures verification (query-call) latency and throughput as N grows
 * from 1 to 10,000 on IC mainnet.
 *
 * IC query calls are answered by a single replica node directly (no
 * consensus needed) making them extremely fast (~150-350 ms observed).
 * This suite quantifies that speed and its scaling behaviour.
 *
 * Two modes per N:
 *   * Sequential  -- verify one cert at a time, captures steady-state latency.
 *   * Concurrent  -- all N fired simultaneously, captures throughput ceiling.
 *
 * Also measures certificate lookup by studentId and by universityName.
 *
 * Result JSON: results/verification_<timestamp>.json
 */

import { summarise, round2 }           from "./stats.js";
import { log, printStats, saveResult } from "./reporter.js";
import {
  VERIFY_SCALES,
  WARMUP_CALLS,
  REPEAT_PER_N,
  SUITE_META,
} from "./config.js";

// ── helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (prefix = "VER") =>
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

const verifyOne = async (actor, id) => {
  const t0 = Date.now();
  await actor.verifyCertificate(id);
  return Date.now() - t0;
};

// ── main benchmark ────────────────────────────────────────────────────────────

export async function runVerification({ authedActor, anonActor }) {
  log.header("VERIFICATION BENCHMARK");
  log.info(`N values: ${VERIFY_SCALES.join(", ")}`);

  // ── Pre-populate: issue enough certs to cover the largest N ─────────────
  const maxN    = Math.max(...VERIFY_SCALES);
  log.sub(`Pre-populating canister with ${maxN.toLocaleString()} certificates ...`);
  const allIds  = [];
  const batchSz = 100;
  for (let i = 0; i < maxN; i += batchSz) {
    const batch = Array.from({ length: Math.min(batchSz, maxN - i) }, () => nextId("PRE"));
    await Promise.all(batch.map(id => authedActor.issueCertificate(...makeCertArgs(id))));
    allIds.push(...batch);
    process.stdout.write(`\r  Issued ${allIds.length}/${maxN}`);
  }
  console.log();
  log.ok(`Pre-population complete: ${allIds.length} certificates in canister`);

  // ── Warm-up ─────────────────────────────────────────────────────────────
  log.sub("Warm-up queries ...");
  for (let i = 0; i < WARMUP_CALLS; i++) {
    await verifyOne(anonActor, allIds[i % allIds.length]);
  }
  log.ok("Warm-up complete");

  const seqResults   = [];
  const concResults  = [];
  const lookupResults = [];

  // ── Sequential verification ──────────────────────────────────────────────
  log.sub("Sequential verification -- one query at a time");
  for (const N of VERIFY_SCALES) {
    const sample = allIds.slice(0, N);
    log.info(`  N = ${N.toLocaleString()} (${REPEAT_PER_N} repeat(s)) ...`);
    const allTimes = [];
    for (let rep = 0; rep < REPEAT_PER_N; rep++) {
      for (const id of sample) {
        allTimes.push(await verifyOne(anonActor, id));
      }
    }
    const stats = summarise(allTimes);
    seqResults.push({ n: N, times_ms: allTimes, ...stats });
    printStats(`Sequential N=${N}`, stats);
  }

  // ── Concurrent verification ──────────────────────────────────────────────
  log.sub("Concurrent verification -- all N queries fired simultaneously");
  for (const N of VERIFY_SCALES) {
    const sample = allIds.slice(0, N);
    log.info(`  N = ${N.toLocaleString()} (${REPEAT_PER_N} repeat(s)) ...`);
    const repWalls       = [];
    const repThroughputs = [];
    let   lastIndividual = [];

    for (let rep = 0; rep < REPEAT_PER_N; rep++) {
      const t0    = Date.now();
      const times = await Promise.all(sample.map(id => verifyOne(anonActor, id)));
      const wall  = Date.now() - t0;
      repWalls.push(wall);
      repThroughputs.push(round2((N / wall) * 1000));
      lastIndividual = times;
    }

    const wallStats = summarise(repWalls);
    concResults.push({
      n:              N,
      wall_ms:        wallStats,
      throughput_qps: summarise(repThroughputs),
      individual_ms:  summarise(lastIndividual),
    });
    log.ok(`  N=${N.toLocaleString()}: mean wall=${wallStats.mean}ms, ${summarise(repThroughputs).mean} queries/s`);
  }

  // ── Lookup by studentId / universityName (at max DB size) ───────────────
  log.sub("Certificate lookup benchmark (at full DB size) ...");
  {
    const lookupTimes = [];
    for (let i = 0; i < 50; i++) {
      const t0 = Date.now();
      await anonActor.getCertificatesByStudent(`STU${String(i % maxN).padStart(6, "0")}`);
      lookupTimes.push(Date.now() - t0);
    }
    const stuStats = summarise(lookupTimes);
    lookupResults.push({ type: "byStudentId", ...stuStats });
    printStats("Lookup by studentId (50 samples)", stuStats);
  }
  {
    const lookupTimes = [];
    for (let i = 0; i < 50; i++) {
      const t0 = Date.now();
      await anonActor.getCertificatesByUniversity("Benchmark University ICP");
      lookupTimes.push(Date.now() - t0);
    }
    const uniStats = summarise(lookupTimes);
    lookupResults.push({ type: "byUniversity", ...uniStats });
    printStats("Lookup by university (50 samples)", uniStats);
  }

  const payload = {
    suite:      "verification",
    ts:         new Date().toISOString(),
    meta:       SUITE_META,
    dbSize:     allIds.length,
    sequential: seqResults,
    concurrent: concResults,
    lookup:     lookupResults,
  };

  const file = saveResult("verification", payload);
  log.ok(`Verification results saved to: ${file}`);
  return payload;
}
