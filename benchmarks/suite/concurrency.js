/**
 * concurrency.js — Throughput under varying concurrency levels.
 *
 * Key ICP claim: horizontal scalability means throughput grows near-linearly
 * with concurrent requests (up to subnet capacity).
 *
 * Protocol:
 *   For each concurrency level C in [1, 2, 5, 10, 20, 50]:
 *     1. Submit CONCURRENCY_TOTAL_CERTS issueCertificate calls in batches of C.
 *     2. Record wall-clock time for each batch + total.
 *     3. Compute per-batch and overall throughput (ops/sec).
 *     4. Also run the same number of verifyCertificate query calls in parallel
 *        to show the query-call side of ICP's performance.
 */

import { summarise, throughput, round2, mean }  from "./stats.js";
import { log, printStats, saveResult }           from "./reporter.js";
import { CONCURRENCY_LEVELS, CONCURRENCY_TOTAL_CERTS, WARMUP_CALLS } from "./config.js";

// ─── Helpers ───────────────────────────────────────────────────────────────

let _seq = 0;
function nextId(prefix = "CONC") {
  return `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

function certArgs(id) {
  return [
    id,
    "ICP Throughput Lab",
    "https://throughput.icp.edu/verify",
    `ThreadStudent ${_seq}`,
    `CON${String(_seq).padStart(6, "0")}`,
    "principal-conc-bench",
    "Bachelor of Science",
    "Distributed Systems",
    "2026-06-01",
    "2026-06-01",
    3.7,
    "With Distinction",
  ];
}

function gaussian(mean, sd) {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(10, mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

// ─── Live canister helpers ─────────────────────────────────────────────────

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

// ─── Issue TOTAL certs in batches of `concurrency` ────────────────────────

async function runIssuanceBatched(actor, total, concurrency, dryRun) {
  const issuedIds   = [];
  const allLatencies = [];
  let   totalWall   = 0;

  for (let done = 0; done < total; ) {
    const batchSize = Math.min(concurrency, total - done);
    const batchT0   = Date.now();

    if (dryRun) {
      const lats = Array.from({ length: batchSize }, () => gaussian(2100, 200));
      allLatencies.push(...lats);
      const wallBatch = Math.max(...lats) + gaussian(30, 10);
      totalWall += wallBatch;
      for (let i = 0; i < batchSize; i++) issuedIds.push(nextId("DR"));
    } else {
      const promises = Array.from({ length: batchSize }, () => {
        const id = nextId();
        issuedIds.push(id);
        return issueOne(actor, id);
      });
      const lats = await Promise.all(promises);
      allLatencies.push(...lats);
      totalWall += Date.now() - batchT0;
    }

    done += batchSize;
    process.stdout.write(`\r    issued ${Math.min(done, total)}/${total}`);
  }
  console.log();
  return { issuedIds, allLatencies, totalWall };
}

// ─── Verify all IDs in one parallel blast ─────────────────────────────────

async function runVerifyParallel(actor, ids, dryRun) {
  if (dryRun) {
    const times = ids.map(() => gaussian(140, 25));
    return { times, totalWall: Math.max(...times) + gaussian(15, 5) };
  }
  const t0    = Date.now();
  const times = await Promise.all(ids.map(id => verifyOne(actor, id)));
  return { times, totalWall: Date.now() - t0 };
}

// ─── Main benchmark ────────────────────────────────────────────────────────

/**
 * @param {{ authedActor: any, anonActor: any }} actors
 * @param {{ dryRun?: boolean }} opts
 */
export async function runConcurrency(actors, opts = {}) {
  const { authedActor, anonActor } = actors;
  const dryRun = opts.dryRun ?? false;
  const TOTAL  = CONCURRENCY_TOTAL_CERTS;

  log.header("CONCURRENCY / THROUGHPUT BENCHMARK");
  log.info(`Mode:           ${dryRun ? "DRY-RUN (synthetic data)" : "LIVE canister"}`);
  log.info(`Total certs:    ${TOTAL} per concurrency level`);
  log.info(`Concurrency:    ${CONCURRENCY_LEVELS.join(", ")}`);

  // ── Warm-up ──────────────────────────────────────────────────────────────
  if (!dryRun) {
    log.sub("Warm-up");
    for (let i = 0; i < WARMUP_CALLS; i++) {
      const id = nextId("WU");
      await issueOne(authedActor, id);
    }
    log.ok("Warm-up complete");
  }

  const results = [];

  for (const C of CONCURRENCY_LEVELS) {
    log.sub(`Concurrency = ${C}`);

    // ── Issuance ─────────────────────────────────────────────────────────
    log.info(`Issuing ${TOTAL} certs in batches of ${C} …`);
    const { issuedIds, allLatencies: issueLats, totalWall: issueWall } =
      await runIssuanceBatched(authedActor, TOTAL, C, dryRun);

    const issueStats       = summarise(issueLats);
    const issueThroughput  = throughput(TOTAL, issueWall);

    printStats("Issuance latency distribution (per-call)", issueStats);
    log.row("total wall-clock (ms)",  round2(issueWall));
    log.row("throughput (ops/s)",     issueThroughput);

    // ── Verification (full parallel blast) ────────────────────────────────
    log.info(`Verifying all ${issuedIds.length} certs simultaneously …`);
    const { times: verifyTimes, totalWall: verifyWall } =
      await runVerifyParallel(anonActor, issuedIds, dryRun);

    const verifyStats      = summarise(verifyTimes);
    const verifyThroughput = throughput(issuedIds.length, verifyWall);

    printStats("Verification latency distribution (per-call)", verifyStats);
    log.row("total wall-clock (ms)",  round2(verifyWall));
    log.row("throughput (ops/s)",     verifyThroughput);

    results.push({
      concurrency: C,
      totalCerts:  TOTAL,
      issuance: {
        times_ms:         issueLats,
        stats:            issueStats,
        total_ms:         round2(issueWall),
        throughput_ops_s: issueThroughput,
      },
      verification: {
        times_ms:         verifyTimes,
        stats:            verifyStats,
        total_ms:         round2(verifyWall),
        throughput_ops_s: verifyThroughput,
      },
    });
  }

  // ── Summary table ────────────────────────────────────────────────────────
  log.header("CONCURRENCY — THROUGHPUT SUMMARY");
  console.log(
    "  " +
    "Concurrency".padEnd(14) +
    "Issue ops/s".padEnd(16) +
    "Issue p95(ms)".padEnd(18) +
    "Verify ops/s".padEnd(16) +
    "Verify p95(ms)"
  );
  for (const r of results) {
    console.log(
      "  " +
      String(r.concurrency).padEnd(14) +
      String(r.issuance.throughput_ops_s).padEnd(16) +
      String(r.issuance.stats.p95).padEnd(18) +
      String(r.verification.throughput_ops_s).padEnd(16) +
      String(r.verification.stats.p95)
    );
  }

  const file = saveResult("concurrency", { results });
  return { results, file };
}
