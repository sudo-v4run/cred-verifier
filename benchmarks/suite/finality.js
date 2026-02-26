/**
 * finality.js — ICP consensus finality time measurement.
 *
 * ICP's key differentiator vs other blockchains: ~1-2 second finality
 * (compare: Ethereum checkpoint finality ~768 s / ~12.8 min, Bitcoin ~60 min).
 *
 * Reference values used for comparison (not measured here — these are
 * well-documented published specifications):
 *   Ethereum: 2 Casper FFG epochs × 32 slots × 12 s/slot = 768 s
 *             Source: ethereum.org/en/developers/docs/consensus-mechanisms/pos
 *   Bitcoin:  6 confirmations × ~10 min/block = ~60 min
 *             Source: bitcoin.org/en/faq ("6 confirmations")
 *
 * When an update call returns from the IC, the state change is already
 * irreversibly committed — there is no "confirmation wait".  The round-trip
 * time of an update call IS the finality time.
 *
 * We issue FINALITY_SAMPLES certificates one-by-one, recording the exact
 * wall-clock milliseconds from the moment the HTTP request is dispatched
 * until the canister response is received.  The distribution of these
 * times directly characterises ICP's finality latency.
 *
 * Additional measurement: `verifyCertificateWithMetrics` (an *update* call
 * on purpose) to show that non-issuance updates also achieve the same
 * finality guarantee at the same latency.
 */

import { summarise, throughput, round2, percentile } from "./stats.js";
import { log, printStats, saveResult }               from "./reporter.js";
import { FINALITY_SAMPLES, WARMUP_CALLS }            from "./config.js";

let _seq = 0;
function nextId(prefix = "FIN") {
  return `${prefix}_${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2, 6)}`;
}
function certArgs(id) {
  return [
    id,
    "ICP Finality Lab",
    "https://finality.icp.edu/verify",
    `FinalityStudent ${_seq}`,
    `FIN${String(_seq).padStart(6, "0")}`,
    "principal-finality",
    "Master of Science",
    "Blockchain Technology",
    "2026-06-01",
    "2026-06-01",
    3.9,
    "Summa Cum Laude",
  ];
}

function gaussian(mean, sd) {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(800, mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

// ─── Main benchmark ────────────────────────────────────────────────────────

/**
 * @param {{ authedActor: any, anonActor: any }} actors
 * @param {{ dryRun?: boolean }} opts
 */
export async function runFinality(actors, opts = {}) {
  const { authedActor, anonActor } = actors;
  const dryRun = opts.dryRun ?? false;

  log.header("FINALITY TIME BENCHMARK");
  log.info(`Mode:    ${dryRun ? "DRY-RUN (synthetic data)" : "LIVE canister"}`);
  log.info(`Samples: ${FINALITY_SAMPLES}`);
  log.info("Measuring: time from HTTP call dispatch to canister response");
  log.nl();

  // ── 1. Warm-up ────────────────────────────────────────────────────────────
  if (!dryRun) {
    log.sub("Warm-up");
    for (let i = 0; i < WARMUP_CALLS; i++) {
      await authedActor.issueCertificate(...certArgs(nextId("WU")));
    }
    log.ok("Warm-up complete");
  }

  // ── 2. Issuance finality ──────────────────────────────────────────────────
  log.sub(`Issuance finality (${FINALITY_SAMPLES} samples)`);
  const issuanceTimes = [];
  const issuedIds     = [];

  for (let i = 0; i < FINALITY_SAMPLES; i++) {
    const id = nextId();
    let ms;
    if (dryRun) {
      ms = gaussian(2050, 180);
    } else {
      const t0 = Date.now();
      await authedActor.issueCertificate(...certArgs(id));
      ms = Date.now() - t0;
    }
    issuanceTimes.push(ms);
    issuedIds.push(id);
    process.stdout.write(`\r    sample ${i + 1}/${FINALITY_SAMPLES}  (${ms.toFixed(0)} ms)`);
  }
  console.log();

  const issStats = summarise(issuanceTimes);
  printStats("Issuance finality distribution", issStats);

  // ── 3. Update-call verification finality ─────────────────────────────────
  // verifyCertificateWithMetrics is an update call — intentionally — so we
  // can measure that non-mutating update calls have the same finality time.
  log.sub(`Update-call verification finality (${issuedIds.length} samples)`);
  const updateVerifyTimes = [];

  for (let i = 0; i < issuedIds.length; i++) {
    let ms;
    if (dryRun) {
      ms = gaussian(2020, 170);
    } else {
      const t0 = Date.now();
      await authedActor.verifyCertificateWithMetrics(issuedIds[i]);
      ms = Date.now() - t0;
    }
    updateVerifyTimes.push(ms);
    process.stdout.write(`\r    sample ${i + 1}/${issuedIds.length}  (${ms.toFixed(0)} ms)`);
  }
  console.log();

  const uvStats = summarise(updateVerifyTimes);
  printStats("Update-call verification finality distribution", uvStats);

  // ── 4. Query-call latency (for contrast) ──────────────────────────────────
  log.sub(`Query-call verification latency (${issuedIds.length} samples)`);
  const queryTimes = [];

  for (let i = 0; i < issuedIds.length; i++) {
    let ms;
    if (dryRun) {
      ms = Math.max(10, gaussian(140, 25));
    } else {
      const t0 = Date.now();
      await anonActor.verifyCertificate(issuedIds[i]);
      ms = Date.now() - t0;
    }
    queryTimes.push(ms);
    process.stdout.write(`\r    sample ${i + 1}/${issuedIds.length}  (${ms.toFixed(0)} ms)`);
  }
  console.log();

  const qStats = summarise(queryTimes);
  printStats("Query-call verification latency distribution", qStats);

  // ── 5. Key ICP comparisons ────────────────────────────────────────────────
  log.header("FINALITY — KEY METRICS FOR RESEARCH PAPER");
  log.row("ICP update call (finality) p50",    `${issStats.p50} ms`);
  log.row("ICP update call (finality) p95",    `${issStats.p95} ms`);
  log.row("ICP update call (finality) p99",    `${issStats.p99} ms`);
  log.row("ICP query call p50",                `${qStats.p50} ms`);
  log.row("ICP query call p95",                `${qStats.p95} ms`);
  log.row("Speedup: query vs update (p50)",    `${round2(issStats.p50 / qStats.p50)}×`);
  log.row("Ethereum checkpoint finality [ref]", "~768,000 ms (~12.8 min, 2 Casper FFG epochs)");
  log.row("Bitcoin 6-conf finality [ref]",      "~3,600,000 ms (~60 min)");
  log.row("ICP vs Ethereum speedup (p50)",       `${Math.round(768000 / issStats.p50)}×`);
  log.row("Source: Ethereum",  "ethereum.org/en/developers/docs/consensus-mechanisms/pos");
  log.row("Source: Bitcoin",   "bitcoin.org (6 confirmations ≈ 60 min)");
  log.nl();

  // CDF buckets for the finality distribution graph
  const allSamples = [...issuanceTimes, ...updateVerifyTimes];
  const cdfBuckets = buildCDF(allSamples);

  const file = saveResult("finality", {
    samples:         FINALITY_SAMPLES,
    issuanceFinality: {
      times_ms: issuanceTimes,
      stats:    issStats,
    },
    updateVerifyFinality: {
      times_ms: updateVerifyTimes,
      stats:    uvStats,
    },
    queryLatency: {
      times_ms: queryTimes,
      stats:    qStats,
    },
    cdfBuckets,
    blockchainComparison: {
      ICP_update_p50_ms:    issStats.p50,
      ICP_query_p50_ms:     qStats.p50,
      // Ethereum checkpoint finality: 2 epochs × 32 slots × 12 s/slot = 768 s
      // Source: ethereum.org/en/developers/docs/consensus-mechanisms/pos
      Ethereum_finality_ms: 768_000,
      Ethereum_block_time_ms: 12_000,   // single slot — NOT finality
      // Bitcoin 6-confirmation convention: 6 × ~10 min = ~60 min
      // Source: bitcoin.org/en/faq
      Bitcoin_finality_ms:  3_600_000,
    },
  });

  return { file, issStats, uvStats, qStats };
}

/** Build a CDF as [{x_ms, cdf}] for plotting */
function buildCDF(times) {
  const s = times.slice().sort((a, b) => a - b);
  return s.map((v, i) => ({
    x_ms: round2(v),
    cdf:  round2((i + 1) / s.length),
  }));
}
