/**
 * config.js — Central configuration for the benchmark suite.
 * All values can be overridden with environment variables.
 *
 * Required env vars (set after `dfx deploy --network ic`):
 *   CANISTER_ID  — canister principal of credential_backend on the chosen network
 *   DFX_NETWORK  — "ic" (mainnet) or "local" (default: "ic")
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dir, "../..");

// Parse the .env file that dfx generates after deployment
function loadDfxEnv() {
  const envPath = resolve(rootDir, ".env");
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw.split("\n")
       .filter(l => l.includes("=") && !l.startsWith("#"))
       .map(l => l.split("=").map(s => s.trim()))
  );
}

const dfxEnv = loadDfxEnv();

export const NETWORK = process.env.DFX_NETWORK ?? dfxEnv.DFX_NETWORK ?? "ic";

export const CANISTER_ID =
  process.env.CANISTER_ID ??
  dfxEnv.CANISTER_ID_CREDENTIAL_BACKEND ??
  null;           // will throw a clear error in agent.js when null

export const HOST =
  NETWORK === "local"
    ? (process.env.LOCAL_HOST ?? "http://localhost:4943")
    : "https://ic0.app";

/** Ed25519 key persisted between runs so the university identity is stable */
export const IDENTITY_FILE = resolve(__dir, ".benchmark_identity.json");

/** Directory where each benchmark writes its result JSON */
export const RESULTS_DIR = resolve(__dir, "../results");

// ---------------------------------------------------------------------------
// Test parameters — sensible defaults, tweak as needed
// ---------------------------------------------------------------------------

/** N values used in the scalability benchmark (issued + verified each) */
export const SCALABILITY_N = [1, 10, 50, 100];

/**
 * Concurrency levels for the throughput benchmark.
 * At each level we submit this many issueCertificate calls simultaneously
 * and measure total wall-clock time + effective ops/sec.
 */
export const CONCURRENCY_LEVELS = [1, 2, 5, 10, 20, 50];

/** Total certificates issued per concurrency level */
export const CONCURRENCY_TOTAL_CERTS = 50;

/** Number of individual finality measurements */
export const FINALITY_SAMPLES = 25;

/** Number of query-call latency samples per N during verification */
export const VERIFY_SAMPLES = 30;

/** Warm-up calls before any timed measurement begins */
export const WARMUP_CALLS = 3;

// Metadata embedded in every result file
export const SUITE_META = {
  project:  "ICP Academic Credential Verification",
  version:  "1.0.0",
  network:  NETWORK,
  host:     HOST,
  canisterId: CANISTER_ID,
};
