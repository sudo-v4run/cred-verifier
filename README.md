# TrustVault — On-Chain Academic Credential Verification

**TrustVault** is a fully on-chain academic credential issuance and verification system built on the [Internet Computer Protocol (ICP)](https://internetcomputer.org). Universities issue credentials as Motoko canister records, protected by an incremental Merkle tree and anchored to ICP's subnet BLS threshold signature via Certified Variables. Anyone can verify a credential without trusting the issuing institution's servers.

Live mainnet canister: [`pekzw-diaaa-aaaad-afh3q-cai`](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=pekzw-diaaa-aaaad-afh3q-cai)

---

## Key Properties

| Property | Detail |
|---|---|
| **Fully on-chain** | Credential data, verification UI, and Merkle proofs all served from an ICP canister |
| **Trustless verification** | Merkle proof + ICP BLS threshold signature — no issuer server required |
| **Mainnet issuance latency** | ~1.9 s (consensus round-trip) |
| **Mainnet verification latency** | 60–937 ms (query call) |
| **Concurrent throughput** | 13.1 ops/s at 50 simultaneous callers, 0% error rate |
| **Issuance cost** | ≈$0.00002 per certificate (estimated from Wasm instruction analysis) |
| **Block finality** | 2.40 s mean, p99 < 3.05 s |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               ICP Canister (Motoko)              │
│                                                  │
│  ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Certificate  │   │      Merkle Tree         │ │
│  │  Manager     │──▶│  (flat-array, O(log n)   │ │
│  │ (CRUD + hash)│   │   insert, O(n) proof)    │ │
│  └──────────────┘   └──────────┬───────────────┘ │
│                                │ root hash        │
│                     ┌──────────▼───────────────┐ │
│                     │   CertifiedData.set()    │ │
│                     │  (subnet BLS signature)  │ │
│                     └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
          ▲                        ▲
          │ update calls (~2 s)    │ query calls (~200 ms)
   University Portal         Verification Portal
   (issue / revoke)          (verify by cert ID)
```

**Backend** (`src/backend/`) — Motoko canister:
- `main.mo` — public actor, all API entry points
- `CertificateManager.mo` — certificate CRUD, hash computation, revocation
- `MerkleTree.mo` — incremental flat-array binary Merkle tree
- `Utils.mo` — `bytesToHex`, `combineHashes` (XOR-based prototype)
- `PerformanceMetrics.mo` — in-canister timing and stats collection
- `Types.mo` — shared Motoko type definitions

**Frontend** (`src/frontend/`) — React 18 + MUI SPA, three tabs:
1. **Verify** — paste or deep-link a certificate ID for instant on-chain verification
2. **Issue** — university portal: register, issue, and revoke credentials
3. **Lookup** — student portal: search all certificates by student ID

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| [DFX](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/) | ≥ 0.15 | `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"` |
| [Mops](https://mops.one) | latest | `npm install -g ic-mops` |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |

---

## Local Development

```bash
# 1. Clone and install dependencies
git clone https://github.com/sudo-v4run/cred-verifier.git
cd cred-verifier
npm install
mops install

# 2. Start a local ICP replica
dfx start --background

# 3. Deploy canisters locally
npm run deploy
# Equivalent to: TERM=xterm-256color dfx deploy

# 4. Start the frontend dev server
cd src/frontend && npm run start   # http://localhost:3000
```

---

## Mainnet Deployment

```bash
# Deploy to ICP mainnet (requires cycles)
dfx deploy --network ic

# Frontend only
dfx deploy --network ic credential_frontend
```

---

## Project Structure

```
cred-verifier/
├── src/
│   ├── backend/                  # Motoko canister source
│   │   ├── main.mo
│   │   ├── Types.mo
│   │   ├── MerkleTree.mo
│   │   ├── CertificateManager.mo
│   │   ├── Utils.mo
│   │   └── PerformanceMetrics.mo
│   └── frontend/                 # React SPA (Vite + MUI)
│       └── src/components/
│           ├── VerificationPortal.jsx
│           ├── UniversityPortal.jsx
│           └── StudentPortal.jsx
├── benchmarks/                   # ICP mainnet benchmark suite
│   ├── run.js                    # CLI entry point
│   ├── suite/                    # Individual suite modules
│   └── results/mainnet_2026-03-06/  # Canonical benchmark results
├── papers/
│   ├── Conference/research_paper.tex
│   └── Journal/journal_paper.tex
├── dfx.json
├── mops.toml
└── mops.lock
```

---

## API Overview

### Update calls (require consensus, ~2 s)

| Method | Description |
|---|---|
| `registerUniversity(name)` | Register caller's principal as an issuing university |
| `issueCertificate(certId, univName, url, recipientName, studentId, principal, degreeType, major, gradDate, issueDate, gpa, honors)` | Issue a new credential |
| `revokeCertificate(certId)` | Revoke a certificate (rebuilds Merkle tree) |
| `verifyCertificateWithMetrics(certId)` | Verify + record timing metrics |

### Query calls (single replica, ~60–937 ms)

| Method | Description |
|---|---|
| `verifyCertificate(certId)` | Verify by ID, returns Merkle proof + root |
| `getCertificate(certId)` | Fetch raw certificate record |
| `getCertificatesByStudent(studentId)` | All certs for a student |
| `getMerkleRoot()` | Current Merkle root hash |
| `getCertifiedData()` | 32-byte BLS-signed root blob |
| `verifyMerkleProof(leafHash, proof)` | Verify a proof client-side |
| `getPerformanceSnapshot()` | Live performance metrics |

### Access control

- `registerUniversity` — open (any principal; prototype simplification)
- `issueCertificate`, `revokeCertificate`, `clearMetrics` — registered universities only
- All query calls — public

---

## Benchmarks

Performance was measured on IC mainnet (March 2026) against the live canister. All results are in `benchmarks/results/mainnet_2026-03-06/`.

| Metric | Result |
|---|---|
| Sequential issuance mean | 1.8–2.6 s |
| Parallel throughput (N=100) | 7.3 certs/s |
| Verification p99 (N=500) | 937 ms |
| Concurrent mixed ops/s (C=50) | 13.1 ops/s |
| Block finality p99 | 3.05 s |
| Peak burst (100 simultaneous) | 100/100 success |

```bash
cd benchmarks && npm install

# Run all suites against mainnet
node run.js

# Single suite
node run.js --suite issuance    # or verification | concurrent | throughput

# Generate paper figures from results
cd visualize && pip install -r requirements.txt && python3 generate_graphs.py
```

---

## Research Papers

This system is described in two academic papers (IEEE format) in `papers/`:

- **`papers/Conference/research_paper.tex`** — conference version
- **`papers/Journal/journal_paper.tex`** — extended journal version

Both compile with `pdflatex`. Pre-compiled PDFs are included.

```bash
cd papers/Conference && pdflatex research_paper.tex
cd papers/Journal    && pdflatex journal_paper.tex
```

---

## Known Limitations

- **Hash functions**: The prototype uses UTF-8 hex encoding (not SHA-256) for `certificate_hash` and XOR-based `combineHashes`. SHA-256 (via `mo:sha2`) is required for production.
- **Revocation cost**: O(n) full Merkle tree rebuild per revocation.
- **University registration**: Self-registration with no admin approval (prototype simplification).
- **`getCertificatesByUniversity`**: O(n) scan — slow at large scale (~6 s at 500 certs).
- **Single canister**: Per-canister throughput is bounded by ICP's consensus serialization.

---

## CI

GitHub Actions (`.github/workflows/mops-test.yml`) runs `mops install && mops test` on every push and pull request to `main`.

---

## License

Research prototype. See individual source files for attribution.
