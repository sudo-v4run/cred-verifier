/**
 * reporter.js — Console output + JSON persistence for benchmark results.
 */

import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { resolve, basename }                                   from "path";
import { RESULTS_DIR, SUITE_META }                             from "./config.js";

// ─── Console helpers ────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  grey:   "\x1b[90m",
  blue:   "\x1b[34m",
};

export const log = {
  header: (msg)    => console.log(`\n${C.bold}${C.cyan}${"=".repeat(60)}\n  ${msg}\n${"=".repeat(60)}${C.reset}`),
  sub:    (msg)    => console.log(`\n${C.bold}${C.blue}── ${msg}${C.reset}`),
  ok:     (msg)    => console.log(`${C.green}  ✓ ${msg}${C.reset}`),
  warn:   (msg)    => console.log(`${C.yellow}  ⚠ ${msg}${C.reset}`),
  err:    (msg)    => console.log(`${C.red}  ✗ ${msg}${C.reset}`),
  info:   (msg)    => console.log(`${C.grey}    ${msg}${C.reset}`),
  row:    (k, v)   => console.log(`    ${C.bold}${String(k).padEnd(26)}${C.reset}${v}`),
  nl:     ()       => console.log(),
};

/** Print a stats object (output of summarise()) */
export function printStats(label, stats) {
  log.sub(label);
  log.row("samples",  stats.samples);
  log.row("min (ms)", stats.min);
  log.row("p50 (ms)", stats.p50);
  log.row("p75 (ms)", stats.p75);
  log.row("p95 (ms)", stats.p95);
  log.row("p99 (ms)", stats.p99);
  log.row("mean (ms)", stats.mean);
  log.row("stddev (ms)", stats.stddev);
}

/** Print a throughput row */
export function printThroughput(concurrency, N, totalMs, opsPerSec) {
  log.row(`conc=${concurrency}  N=${N}  total`, `${totalMs.toFixed(0)} ms  →  ${opsPerSec} ops/s`);
}

// ─── Persistence ────────────────────────────────────────────────────────────

/** Save a result object to results/<suite>_<timestamp>.json */
export function saveResult(suite, data) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const ts   = new Date().toISOString().replace(/[:.]/g, "-");
  const file = resolve(RESULTS_DIR, `${suite}_${ts}.json`);
  const payload = {
    ...SUITE_META,
    suite,
    generatedAt: new Date().toISOString(),
    ...data,
  };
  writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  log.ok(`Results saved → ${basename(file)}`);
  return file;
}

/**
 * Load the most-recent result file for a given suite.
 * Returns null if none exists.
 */
export function loadLatest(suite) {
  if (!existsSync(RESULTS_DIR)) return null;
  const files = readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith(`${suite}_`) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  return JSON.parse(
    readFileSync(resolve(RESULTS_DIR, files[files.length - 1]), "utf8")
  );
}
