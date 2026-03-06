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

// ── Research benchmark scales (tuned for research-paper publication) ─────────
//
//  Scales chosen to:
//    1. Prove scalability   — latency as Merkle tree grows N=1→100
//    2. Prove speed         — query call latency + ICP finality time
//    3. Prove zero-trust    — Merkle proof at each DB size checkpoint
//    4. Prove concurrency   — mixed update+query up to 50 simultaneous callers
//    5. Minimise mainnet cost — total ~1 600 update calls ≈ < $1 USD in cycles
//
//  ISSUANCE_SEQ_SCALES  — sequential issuance, one at a time.
//    N=100 × 3 reps ≈ 300 calls, ~10 min on mainnet. Sufficient for O(log N).
//
//  PARALLEL_SCALES      — burst issuance, all N fired simultaneously.
//    N=100 is safe for IC ingress queue (< 1 000 msgs/s limit).
//
//  VERIFY_SCALES        — concurrent verification (query calls, very cheap).
//    500 covers the entire pre-populated DB; lookups prove O(1) hash check.
//
//  CONCURRENCY_LEVELS   — simultaneous callers (30% update / 70% query).
//    C=50 is realistic for university+employer workload in a paper scenario.

export const ISSUANCE_SEQ_SCALES = [1, 10, 50, 100];
export const PARALLEL_SCALES     = [1, 10, 50, 100];
export const VERIFY_SCALES       = [1, 10, 100, 500];
export const CONCURRENCY_LEVELS  = [1, 5, 10, 25, 50];

/** Warm-up calls before each suite (primes IC routing caches) */
export const WARMUP_CALLS = 2;

/** Repeat each N-point measurement this many times for stable mean/p95/p99.
 *  3 reps gives mean ± stddev suitable for a conference paper table. */
export const REPEAT_PER_N = 3;

// Metadata written into every result JSON
export const SUITE_META = {
  project:   "ICP Academic Credential Verification — Mainnet Research Benchmark",
  network:   NETWORK,
  host:      HOST,
  canisterId: CANISTER_ID ?? "not-set",
};
