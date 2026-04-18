# Project Context: credential-verifier (TrustVault)

> This document is a comprehensive reference for an AI reading this project for the first time.
> It is based exclusively on the code, configs, and benchmark data in this repository.

---

## Project Identity

- **Package name**: `credential-verifier` (`package.json`)
- **UI branding**: TrustVault — Zero Trust Credentials
- **Platform**: Internet Computer Protocol (ICP)
- **Language stack**: Motoko (backend canister), React + TypeScript (frontend)
- **Deployed mainnet canister ID**: `pekzw-diaaa-aaaad-afh3q-cai` (IC mainnet)
- **Local canister ID (credential_backend)**: `u6s2n-gx777-77774-qaaba-cai`
- **Local canister ID (credential_frontend)**: `uxrrr-q7777-77774-qaaaq-cai`

---

## Repository Layout

```
.
├── src/
│   ├── backend/                  # Motoko canister source
│   │   ├── main.mo               # Actor entry point, public API
│   │   ├── Types.mo              # Shared type definitions
│   │   ├── MerkleTree.mo         # Incremental Merkle tree implementation
│   │   ├── CertificateManager.mo # Certificate CRUD + verification logic
│   │   ├── Utils.mo              # Hashing utilities (bytesToHex, combineHashes)
│   │   └── PerformanceMetrics.mo # In-canister metrics collection
│   ├── frontend/                 # React SPA
│   │   ├── src/
│   │   │   ├── App.jsx           # Root component, MUI theme, tab routing
│   │   │   ├── main.jsx          # ReactDOM entry point
│   │   │   └── components/
│   │   │       ├── VerificationPortal.jsx  # Tab 0 — verify a cert by ID
│   │   │       ├── UniversityPortal.jsx    # Tab 1 — issue certificates
│   │   │       └── StudentPortal.jsx       # Tab 2 — look up certs by student ID
│   │   ├── vite.config.js
│   │   └── package.json
│   └── declarations/
│       └── credential_backend/   # Auto-generated Candid JS bindings
├── benchmarks/
│   ├── run.js                    # CLI entry point for benchmark suites
│   ├── README.md                 # Benchmark documentation and results summary
│   ├── suite/
│   │   ├── config.js             # Scales, network config, canister ID
│   │   ├── agent.js              # ICP actor factory (authed + anon)
│   │   ├── identity.js           # Persistent Ed25519 benchmark identity
│   │   ├── scalability.js        # runIssuance — sequential + parallel issuance
│   │   ├── concurrency.js        # runVerification — sequential + concurrent queries
│   │   ├── finality.js           # runConcurrent — mixed 30/70 update+query workload + finality
│   │   ├── stress.js             # runThroughput — sustained 30s + Merkle growth + burst
│   │   ├── stats.js              # Statistical helpers (mean, stddev, percentiles)
│   │   └── reporter.js           # Console output + JSON persistence
│   ├── results/
│   │   ├── mainnet_2026-03-06/   # Authoritative canonical results (March 2026)
│   │   │   ├── issuance_ic_mainnet_2026-03-06.json
│   │   │   ├── verification_ic_mainnet_2026-03-06.json
│   │   │   ├── concurrent_ic_mainnet_2026-03-06.json
│   │   │   └── throughput_ic_mainnet_2026-03-06.json
│   │   └── .gitkeep
│   └── visualize/
│       ├── generate_graphs.py    # Python script to produce PNG/PDF/HTML graphs
│       ├── requirements.txt
│       └── figures/              # Generated PNG/PDF figures + summary_table.tex
├── Paper/
│   ├── Conference/research_paper.tex
│   └── Journal/journal_paper.tex
├── dfx.json                      # DFX project config
├── mops.toml                     # Motoko package manager config
├── package.json                  # Root npm workspace
├── canister_ids.json             # Mainnet canister ID mapping
└── .github/workflows/mops-test.yml
```

---

## Build & Toolchain

- **DFX** (DFINITY SDK) manages canister build and deployment
- **Mops** is the Motoko package manager (`mops sources` used as packtool in `dfx.json`)
- Motoko dependencies: `core@2.1.0`, `base@0.16.0`
- Frontend build: Vite 4 + `@vitejs/plugin-react`
- Frontend package manager: npm workspaces (`src/frontend` is the workspace)
- TypeScript target: ES2020, strict mode
- CI: GitHub Actions runs `mops test` on push/PR to `main`/`master`

### Key Commands

```bash
# Deploy everything
npm run deploy          # runs: TERM=xterm-256color dfx deploy

# Frontend dev server (run manually)
cd src/frontend && npm run start   # vite --port 3000

# Frontend build
cd src/frontend && npm run build   # tsc && vite build

# Run benchmarks (mainnet only)
cd benchmarks && node run.js --suite all
# or individual suites: issuance | verification | concurrent | throughput

# Generate graphs from results
cd benchmarks/visualize && python3 generate_graphs.py
```

---

## Backend Canister — Architecture

### Actor: `AcademicCredentialSystem` (persistent actor class)

Declared as `persistent actor class` in Motoko. Uses `transient var` for runtime state and stable vars for upgrade persistence.

### State

```motoko
// Stable (survives upgrades)
private var certificateEntries : [(CertificateId, Certificate)] = [];
private var universityEntries  : [(Principal, Text)] = [];
private var merkleRootStable   : Text = "";
private var metricsEntries     : [MetricEntry] = [];

// Transient (rebuilt on postupgrade)
private transient var certificates    = HashMap<CertificateId, Certificate>
private transient var universities    = HashMap<Principal, Text>
private transient var certifiedDataHash : Blob
private transient var merkleRoot      : Text
private transient var merkleState     : MerkleTree.TreeState
private transient var performanceMetrics = Buffer<MetricEntry>(100)
```

### Upgrade Hooks

- `preupgrade`: serialises all HashMaps and Buffers to stable arrays
- `postupgrade`: deserialises back, then calls `rebuildCertifiedData()` to reconstruct the Merkle tree from scratch (O(n))

### Metrics Cap

The `performanceMetrics` buffer is capped at 1000 entries. When exceeded, the oldest entries are dropped and only the most recent 1000 are kept.

---

## Data Model (`Types.mo`)

```motoko
Certificate = {
  certificate_id    : Text;
  issuer            : Issuer;       // { name, canister_id, verification_url }
  recipient         : Recipient;    // { name, student_id, principal_id }
  credential        : Credential;   // { degree_type, major, graduation_date, issue_date, gpa, honors }
  certificate_hash  : Text;         // hex string, computed from cert fields
  issuer_signature  : Text;         // currently same as certificate_hash (placeholder)
  is_revoked        : Bool;
  block_timestamp   : Int;          // nanoseconds since epoch (Time.now())
  schema_version    : Text;         // "1.0"
}

VerificationResult = {
  is_valid      : Bool;
  certificate   : ?Certificate;
  verified_hash : Text;
  merkle_proof  : [Text];
  merkle_root   : Text;
  message       : Text;
}
```

---

## Hashing (`Utils.mo`)

### `bytesToHex(bytes: [Nat8]) : Text`

Converts a byte array to a lowercase hex string. Uses `Array.tabulate` in a single pass to avoid O(N²) string concatenation. Returns a `Text` built from a `Char` array via `Text.fromIter`.

### `combineHashes(left: Text, right: Text) : Text`

XOR-combines two hex strings into a 32-byte result. Iterates chars of `left` then `right` directly, XORing into a `[var Nat8]` of length 32. Avoids allocating a concatenated string or intermediate Blob. Returns hex string via `bytesToHex`.

### `textTo32ByteBlob(text: Text) : Blob`

Truncates/pads a text to exactly 32 bytes for use with `CertifiedData.set`.

---

## Merkle Tree (`MerkleTree.mo`)

### Design

A **flat-array complete binary tree** stored in `TreeState`:

```motoko
TreeState = {
  var leaves : Buffer<Text>;   // leaf hashes in insertion order
  var nodes  : [var Text];     // flat array, index 0 = root
  var cap    : Nat;            // current power-of-2 leaf capacity
}
```

Array layout: index 0 = root, children of node `i` are at `2i+1` and `2i+2`. Leaves start at index `cap - 1`.

### Complexity

| Operation        | Complexity              | Notes                                      |
|------------------|-------------------------|--------------------------------------------|
| `insertLeaf`     | O(log n) amortised      | Appends leaf, walks path to root           |
| `buildFromCerts` | O(n)                    | Full rebuild, used only in postupgrade     |
| `getProof`       | O(n) scan + O(log n) walk | Linear scan to find leaf index           |
| `verifyProof`    | O(log n)                | Iterates proof array                       |

### Empty Sentinel

`EMPTY = "0000000000000000000000000000000000000000000000000000000000000000"` (64 zeros). Used for unpopulated tree nodes.

### Growth Strategy

When `leaves.size() >= cap`, the tree doubles capacity (`newCap = cap * 2`), reallocates `nodes`, replaces all leaves, and rebuilds internal nodes before appending the new leaf.

### `insertLeaf` Walk

After placing the new leaf at `nodes[cap - 1 + n]`, it walks up: `parent = (cur - 1) / 2`, recomputing `parentHash(left_child, right_child)` at each level until reaching the root.

### `verifyProof`

Iterates the proof array, combining `currentHash` with each sibling using `combineHashes`. Checks final result against `merkleRoot`. Note: this is order-independent (XOR-based combine), so proof direction is not tracked.

---

## Certificate Manager (`CertificateManager.mo`)

### `computeCertificateHash(cert) : Text`

Concatenates: `certificate_id + issuer.name + recipient.name + recipient.student_id + credential.degree_type + credential.major + credential.graduation_date`, encodes to UTF-8 blob, then calls `bytesToHex`. This is a simple non-cryptographic hash (not SHA-256).

### `createCertificate(...) : Certificate`

Builds the certificate record, computes hash, sets `issuer_signature = hash` (placeholder — not a real signature), `is_revoked = false`, `block_timestamp = Time.now()`, `schema_version = "1.0"`.

### `verifyCertificate(cert, merkleProof, merkleRoot) : VerificationResult`

1. If `cert.is_revoked` → returns invalid with message `"Certificate has been revoked"`
2. Recomputes hash from cert fields
3. If recomputed hash matches `cert.certificate_hash` → valid
4. Otherwise → invalid with `"Certificate hash mismatch - data may have been tampered with"`

Note: the Merkle proof is included in the result but is **not** verified inside this function. Proof verification is separate via `verifyMerkleProof`.

### `revokeCertificate(cert) : Certificate`

Returns a copy of the cert with `is_revoked = true` using Motoko record update syntax.

---

## Performance Metrics (`PerformanceMetrics.mo`)

### Operation Types (variant)

`#issuance | #verification | #revocation | #merkleTreeBuild | #merkleProofGeneration`

### `MetricEntry` Fields

`operation, startTime, endTime, duration (ns), certificateCount, success, additionalInfo`

### Key Functions

- `calculateSummary(metrics, opType)` → `MetricsSummary` with avg/min/max/total in **microseconds** (ns ÷ 1000)
- `calculateLoadMetrics(metrics, opType)` → `LoadTestResult` with ops/second
- `getSnapshot(metrics, totalCerts)` → `PerformanceSnapshot`
- `getRecentMetrics(metrics, count)` → last N entries
- `calculatePercentile(durations, percentile)` → sorts and interpolates

---

## Public API (Candid — `credential_backend.did`)

### Update Calls (require consensus, ~2s on mainnet)

| Method | Args | Returns |
|--------|------|---------|
| `registerUniversity(name)` | Text | Bool |
| `issueCertificate(certId, univName, verificationUrl, recipientName, studentId, recipientPrincipal, degreeType, major, graduationDate, issueDate, gpa, honors)` | 12 args | Text (certId or error) |
| `revokeCertificate(certId)` | Text | Bool |
| `verifyCertificateWithMetrics(certId)` | Text | VerificationResult |
| `clearMetrics()` | — | Bool |

### Query Calls (single replica, ~200–500ms on mainnet)

| Method | Returns |
|--------|---------|
| `getCertificate(certId)` | `?Certificate` |
| `verifyCertificate(certId)` | `VerificationResult` |
| `getCertificatesByStudent(studentId)` | `[Certificate]` |
| `getCertificatesByUniversity(univName)` | `[Certificate]` |
| `getTotalCertificates()` | Nat |
| `getMerkleRoot()` | Text |
| `getCertifiedData()` | Blob |
| `verifyMerkleProof(leafHash, proof)` | Bool |
| `isRegisteredUniversity(principal)` | Bool |
| `getUniversityName(principal)` | `?Text` |
| `getAllUniversities()` | `[(Principal, Text)]` |
| `getAllMetrics()` | `[MetricEntry]` |
| `getMetricsSummary(opType)` | `?MetricsSummary` |
| `getAllMetricsSummaries()` | `[MetricsSummary]` |
| `getLoadMetrics(opType)` | `?LoadTestResult` |
| `getPerformanceSnapshot()` | `PerformanceSnapshot` |
| `getRecentMetrics(count)` | `[MetricEntry]` |
| `getMetricsCount()` | Nat |

### Access Control

- `registerUniversity`: open to any caller (self-registration)
- `issueCertificate`: only callers registered via `registerUniversity` (checked via `isUniversity(msg.caller)`)
- `revokeCertificate`: only registered universities
- `clearMetrics`: only registered universities
- All query calls: public, no auth

---

## Frontend — React SPA

### Tech Stack

- React 18, React Router DOM 7
- MUI (Material UI) v7 with custom dark theme
- `@dfinity/agent`, `@dfinity/auth-client`, `@dfinity/candid`, `@dfinity/principal` v3
- Vite 4 build, SASS, TypeScript

### Theme

Dark mode. Background `#07071a` / `#0d0d20`. Primary purple `#8b5cf6`. Secondary blue `#3b82f6`. Success green `#10b981`. All border-radius set to 0 (sharp corners). Custom scrollbar, button, chip, alert, accordion, and text field overrides.

### Routing

Single-page, tab-based (no URL routing for tabs). Three tabs:

1. **Verify** (index 0, default) — `VerificationPortal`
2. **Issue** (index 1) — `UniversityPortal`
3. **Certificate Lookup** (index 2) — `StudentPortal`

Deep-link support: URL hash `#/verify/{univ-slug}/{batch-year}/{cert-id}` auto-fills and triggers verification on load.

### `VerificationPortal.jsx`

- Builds an `HttpAgent` (local: `http://127.0.0.1:4943`, mainnet: `https://ic0.app`), fetches root key only on local
- Calls `verifyCertificate(id)` (query) and `getCertifiedData()` (query)
- Displays: status banner, certificate detail card, certified data hex, security/proof accordion
- Certified data is displayed as a hex string of the 32-byte blob
- Actor is cached in a `useRef` to avoid re-creating on every verify

### `UniversityPortal.jsx`

- Registration state persisted in `localStorage` (`cv_university_isRegistered`, `cv_university_name`)
- Auto-generates certificate IDs: `{year}-{UNIV-SLUG}-{RANDOM}` format
- Verification URL auto-computed as `{origin}/#/verify/{slug}/{year}/{certId}`
- On success, shows a shareable verification link with copy button
- `issueDate` field in the form maps to `issue_date` (start date) in the credential; `completionDate` maps to `graduation_date`

### `StudentPortal.jsx`

- Calls `getCertificatesByStudent(studentId)` (query)
- Displays all matching certificates with status chip (VERIFIED / REVOKED)
- Download as JSON button exports the full certificate object
- Copy certificate ID button with 2-second feedback

---

## Benchmark Suite

### Network

All benchmarks run exclusively against **IC mainnet** (`https://ic0.app`). No local replica support.

### Identity

Persistent Ed25519 key stored in `benchmarks/suite/.benchmark_identity.json`. Reused across runs so the benchmark principal stays registered as a university.

### Scales (from `config.js`)

```js
ISSUANCE_SEQ_SCALES = [1, 10, 50, 100]
PARALLEL_SCALES     = [1, 10, 50, 100]
VERIFY_SCALES       = [1, 10, 100, 500]
CONCURRENCY_LEVELS  = [1, 5, 10, 25, 50]
WARMUP_CALLS        = 2
REPEAT_PER_N        = 3
```

### Suite Descriptions

| Suite file        | Exported fn       | What it measures |
|-------------------|-------------------|-----------------|
| `scalability.js`  | `runIssuance`     | Sequential + parallel issuance latency/throughput at N=1,10,50,100 |
| `concurrency.js`  | `runVerification` | Sequential + concurrent query latency at N=1,10,100,500; lookup by studentId and university |
| `finality.js`     | `runConcurrent`   | ICP finality time (submit→readable); mixed 30% update / 70% query at C=1,5,10,25,50 |
| `stress.js`       | `runThroughput`   | 30s sustained issuance; Merkle growth at batch sizes 1,10,50,100; 100-call peak burst |

### Result Persistence

- `saveResult(suite, data)` → `results/{suite}_{timestamp}.json`
- `saveLive(suite, data)` → `results/{suite}_live.json` (overwritten after each N-point for crash safety)

Note: after a benchmark run, copy the desired result files into `results/mainnet_2026-03-06/` with canonical names to make them authoritative.

---

## Benchmark Results — IC Mainnet (2026-03-06) — AUTHORITATIVE

All numbers below are from `benchmarks/results/mainnet_2026-03-06/`.

### Issuance (update calls, require consensus)

**Sequential issuance** (one cert at a time, 3 reps each N):

| N   | samples | mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | stddev |
|-----|---------|-----------|----------|----------|----------|--------|
| 1   | 3       | 2635      | 1944     | 3893     | 4066     | 1043   |
| 10  | 30      | 2077      | 1913     | 4227     | 5050     | 920    |
| 50  | 150     | 2269      | 1897     | 2508     | 9523     | 3322   |
| 100 | 300     | 1821      | 1861     | 2257     | 3561     | 432    |

**Parallel (burst) issuance** (all N fired simultaneously, 3 reps):

| N   | wall mean (ms) | wall p50 | throughput mean (certs/s) | individual p50 (ms) |
|-----|----------------|----------|--------------------------|---------------------|
| 1   | 1943           | 1910     | 0.52                     | 1910                |
| 10  | 2596           | 2794     | 4.02                     | 1401                |
| 50  | 6933           | 6822     | 7.23                     | 3995                |
| 100 | 13969          | 15222    | 7.31                     | 10017               |

### Verification (query calls, single replica)

**Sequential verification** (DB size = 500 certs, 3 reps each N):

| N   | samples | mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|-----|---------|-----------|----------|----------|----------|
| 1   | 3       | 227       | 202      | 396      | 414      |
| 10  | 30      | 359       | 345      | 600      | 627      |
| 100 | 300     | 405       | 400      | 693      | 937      |
| 500 | 1500    | 389       | 381      | 644      | 829      |

**Concurrent verification** (all N fired simultaneously):

| N   | wall mean (ms) | throughput mean (qps) | individual p50 (ms) |
|-----|----------------|-----------------------|---------------------|
| 1   | 306            | 3.55                  | 196                 |
| 10  | 778            | 13.33                 | 390                 |
| 100 | 1889           | 53.27                 | 718                 |
| 500 | 4883           | 112.44                | 2107                |

**Lookup benchmarks** (at 500-cert DB, 50 samples each):

| Type            | mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|-----------------|-----------|----------|----------|----------|
| byStudentId     | 394       | 380      | 665      | 872      |
| byUniversity    | 6307      | 5299     | 12716    | 18556    |

Note: `getCertificatesByUniversity` is O(n) scan over all certificates — very slow at scale.

### Concurrent Mixed Workload (30% update / 70% query)

**ICP Finality** (submit `issueCertificate` → cert readable via `verifyCertificate`, 20 samples):

- mean: **2400 ms**, p50: 2490 ms, p75: 2564 ms, p95: 2987 ms, p99: 3047 ms, min: 1443 ms, max: 3062 ms

**Mixed workload** (C simultaneous callers):

| C  | issueCount | verifyCount | wall mean (ms) | throughput mean (ops/s) | error rate |
|----|-----------|------------|----------------|------------------------|------------|
| 1  | 1         | 0          | 2107           | 0.48                   | 0          |
| 5  | 2         | 3          | 2304           | 2.24                   | 0          |
| 10 | 3         | 7          | 2417           | 4.20                   | 0          |
| 25 | 8         | 17         | 2899           | 9.14                   | 0          |
| 50 | 15        | 35         | 3830           | 13.09                  | 0          |

Zero errors at all concurrency levels tested.

### Throughput / Merkle Growth

**Sustained issuance** (30 seconds, sequential):

- Total issued: **17 certs** in 30s → **0.57 certs/s**
- Latency: mean 1820 ms, p50 1817 ms, p75 1942 ms, p95 2117 ms, p99 2158 ms, min 967 ms, max 2168 ms
- Throughput stable across 10s windows: 0.5 / 0.6 / 0.5 certs/s

**Merkle tree growth** (parallel batch issuance, DB was ~3600 certs at time of test):

| Batch size | DB size after | Wall time (ms) | Throughput (certs/s) |
|-----------|--------------|----------------|---------------------|
| 1         | 3650         | 2077           | 0.48                |
| 10        | 3660         | 3330           | 3.00                |
| 50        | 3710         | 6253           | 8.00                |
| 100       | 3810         | 15013          | 6.66                |

**Peak burst** (100 simultaneous `issueCertificate` calls):

- Succeeded: **100/100** (0% error rate)
- Wall time: 13799 ms
- Throughput: **7.25 certs/s**
- Latency: mean 9528 ms, p50 9942 ms, p75 11596 ms, p95 13276 ms, p99 13684 ms, min 4754 ms, max 13792 ms

---

## Key Design Decisions & Constraints

### Certified Data

The canister calls `CertifiedData.set(certBlob)` after every issuance and revocation. The 32-byte blob is the first 32 bytes of the Merkle root text encoded as UTF-8. This allows clients to verify the root against the IC subnet's threshold BLS signature.

### Incremental vs Full Rebuild

- **Issuance**: calls `insertLeaf` (O(log n)) — fast path
- **Revocation**: calls `rebuildCertifiedData` → `buildFromCerts` (O(n)) — full rebuild because the tree structure changes
- **postupgrade**: always full rebuild

### Hash Function

The certificate hash is **not** a standard cryptographic hash (not SHA-256). It is `bytesToHex(Text.encodeUtf8(concatenated_fields))` — essentially a hex encoding of the raw UTF-8 bytes of the concatenated fields. The `combineHashes` function uses XOR, not a proper hash combiner. This is a research/demo system, not production-grade cryptography.

### `issuer_signature`

Currently set equal to `certificate_hash`. This is explicitly noted as a placeholder — in production it would be a proper digital signature.

### University Registration

Self-registration: any principal can call `registerUniversity(name)` and become an issuer. There is no admin gate or approval process.

### `getCertificatesByUniversity` Performance

This is a full O(n) scan using `Array.filter` over all certificates. At 500 certs the mean query time is already 6.3 seconds. This is a known scalability bottleneck.

### Metrics in Query Calls

`verifyCertificate` is a query call and cannot record metrics (query calls cannot write state). Use `verifyCertificateWithMetrics` (update call) for metrics-tracked verification.

### Frontend Actor Caching

`VerificationPortal` caches the ICP actor in a `useRef` to avoid re-creating the `HttpAgent` on every verification call.

### Deep-Link Verification

The URL hash format `#/verify/{univ-slug}/{batch-year}/{cert-id}` is parsed on load. If present, the app starts on the Verify tab and auto-triggers verification with the extracted cert ID.

---

## CI/CD

`.github/workflows/mops-test.yml`:

- Triggers on push to `main`/`master` and on PRs
- Uses `dfinity/setup-mops@v1`
- Runs `mops install` then `mops test`
- No deployment automation — deployment is manual via `dfx deploy --network ic`

---

## Paper / Research Context

The `Paper/` directory contains LaTeX source for two academic papers:

- `Paper/Conference/research_paper.tex` — conference paper
- `Paper/Journal/journal_paper.tex` — journal paper

Both papers are about this system. The benchmark suite was designed specifically to generate research-paper-quality data (stated in `config.js` comments). The benchmark scales were chosen to prove: scalability (O(log n) Merkle), speed (query latency + finality), zero-trust (Merkle proof), and concurrency (mixed workload up to 50 callers).
