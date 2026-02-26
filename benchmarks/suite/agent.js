/**
 * agent.js — Factory for creating authenticated and anonymous ICP actors.
 *
 * Build two actors per benchmark run:
 *  • authedActor  — authenticated with the benchmark identity (needed for
 *                   update calls: registerUniversity, issueCertificate, …)
 *  • anonActor    — anonymous identity (sufficient for query calls)
 *
 * Both interact with the same canister so query + update results are
 * directly comparable.
 */

import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory }        from "../../src/declarations/credential_backend/credential_backend.did.js";
import { CANISTER_ID, HOST, NETWORK } from "./config.js";
import { loadOrCreateIdentity }        from "./identity.js";

/**
 * Create and fetch-root-key-if-needed HttpAgent.
 * @param {import("@dfinity/agent").Identity} [identity]
 */
async function makeAgent(identity) {
  if (!CANISTER_ID) {
    throw new Error(
      "CANISTER_ID is not set.\n" +
      "  → Deploy to mainnet first:  dfx deploy --network ic\n" +
      "  → Then set env var:         CANISTER_ID=<your_canister_id>\n" +
      "  → Or run a dry-run instead: node run.js --dry-run"
    );
  }

  const agent = new HttpAgent({
    host:     HOST,
    identity: identity ?? undefined,
  });

  // Fetch root key only for local replica (never on mainnet)
  if (NETWORK === "local") {
    await agent.fetchRootKey();
  }

  return agent;
}

/**
 * Build the two actors needed for benchmarking.
 * @returns {Promise<{ authedActor: any, anonActor: any, principal: string, isNewIdentity: boolean }>}
 */
export async function buildActors() {
  const { identity, isNew: isNewIdentity } = loadOrCreateIdentity();

  const [authedAgent, anonAgent] = await Promise.all([
    makeAgent(identity),
    makeAgent(),
  ]);

  const authedActor = Actor.createActor(idlFactory, {
    agent:     authedAgent,
    canisterId: CANISTER_ID,
  });

  const anonActor = Actor.createActor(idlFactory, {
    agent:     anonAgent,
    canisterId: CANISTER_ID,
  });

  return {
    authedActor,
    anonActor,
    principal:      identity.getPrincipal().toText(),
    isNewIdentity,
  };
}
