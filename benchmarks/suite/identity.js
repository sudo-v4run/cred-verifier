/**
 * identity.js — Persistent Ed25519 benchmark identity.
 *
 * On the first run a fresh key pair is generated and written to IDENTITY_FILE.
 * Subsequent runs reload the same key, giving the benchmark a stable principal
 * that can be pre-registered as a "university" on the target canister.
 */

import { Ed25519KeyIdentity } from "@dfinity/identity";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { IDENTITY_FILE } from "./config.js";

/**
 * Load (or create) the benchmark identity.
 * @returns {{ identity: Ed25519KeyIdentity, isNew: boolean }}
 */
export function loadOrCreateIdentity() {
  if (existsSync(IDENTITY_FILE)) {
    const raw = JSON.parse(readFileSync(IDENTITY_FILE, "utf8"));
    const identity = Ed25519KeyIdentity.fromParsedJson(raw);
    return { identity, isNew: false };
  }

  const identity = Ed25519KeyIdentity.generate();
  writeFileSync(
    IDENTITY_FILE,
    JSON.stringify(identity.toJSON(), null, 2),
    "utf8"
  );
  return { identity, isNew: true };
}
