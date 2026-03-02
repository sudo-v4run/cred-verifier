#!/usr/bin/env node
/**
 * run.js — Mainnet Research Benchmark Runner
 *
 * Measures real-world performance of the Academic Credential Verification
 * system deployed on the Internet Computer mainnet.
 *
 * Usage:
 *   node run.js [--suite all|issuance|verification|concurrent|throughput]
 *   node run.js --help
 *
 * Prerequisites:
 *   1. Deploy to mainnet:   dfx deploy --network ic
 *   2. Set canister ID:     export CANISTER_ID=<credential_backend-canister-id>
 *      (or it is read from .env automatically)
 *
 * After running, generate research paper graphs:
 *   cd visualize && pip install -r requirements.txt && python3 generate_graphs.py
 *
 * Suites:
 *   issuance      — sequential + parallel certificate issuance at N=1,10,100,1000,10000
 *   verification  — sequential + concurrent cert verification at N=1,10,100,1000,10000
 *   concurrent    — mixed concurrent workload at C=1,5,10,25,50,100,500 simultaneous callers
 *   throughput    — sustained throughput & Merkle-tree rebuild time as DB grows
 *   all           — run all four suites (default)
 */

import { parseArgs }         from "node:util";
import { buildActors }       from "./suite/agent.js";
import { log }               from "./suite/reporter.js";
import { runIssuance }       from "./suite/scalability.js";
import { runVerification }   from "./suite/concurrency.js";
import { runConcurrent }     from "./suite/finality.js";
import { runThroughput }     from "./suite/stress.js";
import { CANISTER_ID, HOST } from "./suite/config.js";

const { values: argv } = parseArgs({
  options: {
    suite:  { type: "string",  default: "all"  },
    help:   { type: "boolean", default: false  },
  },
  allowPositionals: false,
  strict: false,
});

if (argv.help) {
  console.log(`
ICP Academic Credential Verification — Mainnet Research Benchmark
Usage: node run.js [--suite <name>]

Suites:
  issuance      Sequential + parallel issuance at N=1,10,100,1000,10000
  verification  Sequential + concurrent verification at N=1,10,100,1000,10000
  concurrent    Mixed concurrent workload (issuance + verification)
                at C=1,5,10,25,50,100,500 simultaneous callers
  throughput    Sustained throughput & Merkle-tree rebuild time vs N
  all           Run all four suites (default)

Prerequisites:
  export CANISTER_ID=<your_mainnet_canister_id>
  (or place it in .env as CANISTER_ID_CREDENTIAL_BACKEND=<id>)

After running:
  cd visualize
  pip install -r requirements.txt
  python3 generate_graphs.py
`);
  process.exit(0);
}

const SUITE = argv.suite;
const VALID_SUITES = ["all", "issuance", "verification", "concurrent", "throughput"];

if (!VALID_SUITES.includes(SUITE)) {
  console.error(`Unknown suite: "${SUITE}". Valid values: ${VALID_SUITES.join(" | ")}`);
  process.exit(1);
}

async function main() {
  log.header("ICP ACADEMIC CREDENTIAL VERIFICATION — MAINNET RESEARCH BENCHMARK");
  log.row("Suite",    SUITE);
  log.row("Network",  "IC Mainnet");
  log.row("Host",     HOST);
  log.row("Canister", CANISTER_ID ?? "(not set)");
  log.nl();

  if (!CANISTER_ID) {
    log.err("CANISTER_ID is not set.");
    log.info("  Deploy first:  dfx deploy --network ic");
    log.info("  Then export:   export CANISTER_ID=<canister_id>");
    log.info("  Or add to .env: CANISTER_ID_CREDENTIAL_BACKEND=<canister_id>");
    process.exit(1);
  }

  // ── Connect to mainnet canister ──────────────────────────────────────────
  log.sub("Connecting to IC mainnet canister …");
  let actors;
  try {
    actors = await buildActors();
    log.ok(`Connected. Benchmark principal: ${actors.principal}`);
    // Re-register university identity (idempotent)
    await actors.authedActor.registerUniversity("Benchmark University ICP");
    log.ok("University identity confirmed.");
  } catch (err) {
    log.err(`Connection failed: ${err.message}`);
    process.exit(1);
  }
  log.nl();

  // ── Run selected suites ──────────────────────────────────────────────────
  const run = async (name, fn) => {
    try {
      await fn(actors);
    } catch (err) {
      log.err(`Suite "${name}" failed: ${err.message}`);
      console.error(err);
    }
  };

  if (SUITE === "all" || SUITE === "issuance")     await run("issuance",     runIssuance);
  if (SUITE === "all" || SUITE === "verification") await run("verification", runVerification);
  if (SUITE === "all" || SUITE === "concurrent")   await run("concurrent",   runConcurrent);
  if (SUITE === "all" || SUITE === "throughput")   await run("throughput",   runThroughput);

  log.nl();
  log.header("ALL BENCHMARKS COMPLETE");
  log.info("Generate research paper graphs:");
  log.info("  cd benchmarks/visualize");
  log.info("  pip install -r requirements.txt");
  log.info("  python3 generate_graphs.py");
  log.info("Output: benchmarks/visualize/figures/  (PNG + PDF + HTML dashboard)");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
