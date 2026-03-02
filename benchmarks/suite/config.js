/**
 * config.js — Mainnet-only research benchmark configuration.
 *
 * All tests run exclusively against the deployed IC mainnet canister.
 * This benchmark suite is designed to generate research-paper-quality data.
 *
 * Prerequisites:
 *   dfx deploy --network ic
 *   export CANISTER_ID=<credential_backend-canister-id>   # or add to .env
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname }         from "path";
import { fileURLToPath }            from "url";

const __dir   = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dir, "../..");

function loadDfxEnv() {
  const envPath = resolve(rootDir, ".env");
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw.split("\n")
       .filter(l => l.includes("=") && !l.startsWith("#"))
       .map(l => {
         const idx = l.indexOf("=");
         return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
       })
  );
}

const dfxEnv = loadDfxEnv();

// ── Network — IC mainnet only ────────────────────────────────────────────────

export const NETWORK = "ic";
export const HOST    = "https://ic0.app";

export const CANISTER_ID =
  process.env.CANISTER_ID ??
  dfxEnv.CANISTER_ID_CREDENTIAL_BACKEND ??
  null;

/** Ed25519 key file — stable benchmark identity between runs */
export const IDENTITY_FILE = resolve(__dir, ".benchmark_identity.json");

/** Directory for result JSON files */
export const RESULTS_DIR = resolve(__dir, "../results");

// ── Research benchmark scales ─────────────────────────────────────────────────
//
//  N = number of certificates in each workload batch.
//
//  ISSUANCE_SEQ_SCALES  — sequential issuance (awaited one by one).
//    Stops at 1 000 to keep run time practical (~45 min for 1 000 at 2.5 s/call).
//
//  PARALLEL_SCALES      — all N certs fired simultaneously.
//    Captures wall-clock "burst" time and effective ops/sec.
//
//  VERIFY_SCALES        — N concurrent verification (query) calls.
//    Query calls are fast (~150–350 ms) so 10 000 is safe.
//
//  CONCURRENCY_LEVELS   — simultaneous callers hitting the canister.

export const ISSUANCE_SEQ_SCALES = [1, 10, 100, 1_000];
export const PARALLEL_SCALES     = [1, 10, 100, 1_000, 10_000];
export const VERIFY_SCALES       = [1, 10, 100, 1_000, 10_000];
export const CONCURRENCY_LEVELS  = [1, 5, 10, 25, 50, 100, 500];

/** Warm-up calls before each suite (primes IC routing caches) */
export const WARMUP_CALLS = 3;

/** Repeat each N-point measurement this many times for stable mean/p95/p99 */
export const REPEAT_PER_N = 5;

// Metadata written into every result JSON
export const SUITE_META = {
  project:   "ICP Academic Credential Verification — Mainnet Research Benchmark",
  network:   NETWORK,
  host:      HOST,
  canisterId: CANISTER_ID ?? "not-set",
};
