#!/usr/bin/env node
/**
 * run.js — Benchmark CLI runner.
 *
 * Usage:
 *   node run.js [--suite all|scalability|concurrency|finality] [--dry-run] [--network local|ic]
 *
 * Examples:
 *   node run.js --dry-run                     # generate synthetic data without a canister
 *   node run.js --suite finality              # only finality timing
 *   node run.js --network ic --suite all      # full run against mainnet
 *
 * Env vars (highest priority):
 *   CANISTER_ID   — backend canister principal
 *   DFX_NETWORK   — "ic" or "local"
 */

import { parseArgs }       from "node:util";
import { buildActors }     from "./suite/agent.js";
import { log }             from "./suite/reporter.js";
import { runScalability }  from "./suite/scalability.js";
import { runConcurrency }  from "./suite/concurrency.js";
import { runFinality }     from "./suite/finality.js";
import { CANISTER_ID, NETWORK, HOST } from "./suite/config.js";

// ─── Argument parsing ───────────────────────────────────────────────────────

const { values: argv } = parseArgs({
  options: {
    suite:     { type: "string",  default: "all"  },
    "dry-run": { type: "boolean", default: false  },
    network:   { type: "string",  default: NETWORK },
    help:      { type: "boolean", default: false  },
  },
  allowPositionals: false,
  strict: false,
});

if (argv.help) {
  console.log(`
ICP Credential Verification — Benchmark Runner
Usage: node run.js [options]

Options:
  --suite     Which benchmark to run: all | scalability | concurrency | finality
              (default: all)
  --dry-run   Operate on synthetic data — no canister required.
              Useful for testing the visualisation pipeline.
  --network   "ic" (mainnet) or "local" (dfx replica)   (default: ${NETWORK})
  --help      Show this message

Environment variables:
  CANISTER_ID       Principal of the deployed credential_backend canister
  DFX_NETWORK       "ic" or "local"

After running, visualise results:
  cd visualize && pip install -r requirements.txt && python3 generate_graphs.py
`);
  process.exit(0);
}

const SUITE   = argv.suite;
const DRY_RUN = argv["dry-run"];

// ─── Entry point ────────────────────────────────────────────────────────────

async function main() {
  log.header("ICP ACADEMIC CREDENTIAL VERIFICATION — BENCHMARKS");
  log.row("Suite",    SUITE);
  log.row("Mode",     DRY_RUN ? "DRY-RUN (synthetic)" : "LIVE");
  log.row("Network",  NETWORK);
  log.row("Host",     HOST);
  log.row("Canister", CANISTER_ID ?? "(not set — dry-run only)");
  log.nl();

  if (!DRY_RUN && !CANISTER_ID) {
    log.err("CANISTER_ID is not set.");
    log.info("  → Deploy first:  dfx deploy --network ic");
    log.info("  → Then run:      CANISTER_ID=<id> node run.js");
    log.info("  → Or dry-run:    node run.js --dry-run");
    process.exit(1);
  }

  // ── Build ICP actors (or pass null stubs in dry-run) ──────────────────────
  let actors = { authedActor: null, anonActor: null };

  if (!DRY_RUN) {
    log.sub("Connecting to canister …");
    try {
      actors = await buildActors();
      log.ok(`Authenticated principal: ${actors.principal}`);
      if (actors.isNewIdentity) {
        log.warn("New benchmark identity created. Registering as university …");
        await actors.authedActor.registerUniversity("Benchmark University ICP");
        log.ok("University registered.");
      } else {
        // Re-register on every run (idempotent — canister just overwrites)
        await actors.authedActor.registerUniversity("Benchmark University ICP");
        log.ok("University re-confirmed.");
      }
    } catch (err) {
      log.err(`Connection failed: ${err.message}`);
      process.exit(1);
    }
  }

  const opts = { dryRun: DRY_RUN };

  // ── Run selected suites ───────────────────────────────────────────────────
  const run = async (name, fn) => {
    try {
      await fn(actors, opts);
    } catch (err) {
      log.err(`Suite "${name}" failed: ${err.message}`);
      console.error(err);
    }
  };

  if (SUITE === "all" || SUITE === "scalability") {
    await run("scalability", runScalability);
  }
  if (SUITE === "all" || SUITE === "concurrency") {
    await run("concurrency", runConcurrency);
  }
  if (SUITE === "all" || SUITE === "finality") {
    await run("finality", runFinality);
  }

  if (!["all", "scalability", "concurrency", "finality"].includes(SUITE)) {
    log.err(`Unknown suite: "${SUITE}". Valid: all | scalability | concurrency | finality`);
    process.exit(1);
  }

  log.header("ALL BENCHMARKS COMPLETE");
  log.info("Next step: generate visualisations");
  log.info("  cd visualize");
  log.info("  pip install -r requirements.txt");
  log.info("  python3 generate_graphs.py");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
