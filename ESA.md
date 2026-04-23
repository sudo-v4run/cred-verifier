# TrustVault — ESA Presentation Content

## Project Title
**TrustVault: A Fully On-Chain, Trustless Academic Credential Verification System on the Internet Computer Protocol**

**Submitted by:** Varun Gudamsetti
**Guide:** Dr. Shruti Jadon
**Department of Computer Science, PES University, Bengaluru**

---

## 1. Abstract

### Slide 1: Problem & Approach

- Academic credential fraud affects ~20% of job applications; existing solutions rely on centralized registries or costly public blockchains with off-chain frontends
- TrustVault is a fully on-chain credential verification system on the Internet Computer Protocol (ICP) — both data and UI served from the blockchain
- Uses an incremental binary Merkle tree (O(log n) insert) with roots anchored via ICP's Certified Variables backed by threshold BLS signatures
- Deployed and benchmarked on ICP mainnet (canister ID: `pekzw-diaaa-aaaad-afh3q-cai`) with zero downtime since deployment
- Tech stack: Motoko (backend canister), React 18 + Vite (frontend canister), Material UI v7

### Slide 2: Key Results

- Issuance latency: ~1.9 s; Verification queries: as fast as 60 ms (free query calls)
- Parallel throughput: 7.3 certs/s; Concurrent mixed-load: 13.1 ops/s at 50 callers with 0% error rate
- Issuance cost: ~$0.00002 per certificate — over 10,000× cheaper than Ethereum
- Block finality: 2.40 s mean (p99 < 3.05 s); O(log n) scaling confirmed with <10% degradation at 3,280+ certificates
- First system to store full credential records on-chain, serve verification UI from blockchain, and publish reproducible mainnet benchmarks

---

## 2. Summary of Requirements and Design

### Slide 1: Major Requirements

- **FR-1 to FR-3:** University registration (ICP Principal-based), certificate issuance (12-field records with auto-computed hash + Merkle insertion), and public verification (hash recomputation + Merkle proof, no auth needed)
- **FR-4 to FR-6:** Certificate revocation (Merkle tree rebuild + new certified root within ~2 s), student/university lookup queries, and on-chain performance telemetry (capped at 1,000 metrics)
- **NFR-1:** Issuance < 3 s, Verification < 1 s, Parallel throughput > 5 certs/s
- **NFR-2 to NFR-3:** 100% on-chain availability (no cloud servers), access control via Ed25519 Principals, tamper detection via Merkle proofs
- **NFR-4 to NFR-6:** O(log n) Merkle scaling, issuance cost < $0.001/cert, state persistence across canister upgrades via preupgrade/postupgrade hooks

### Slide 2: State of the Art — Strengths & Weaknesses

| System | Strengths | Weaknesses |
|---|---|---|
| Blockcerts / MIT (2017) | First blockchain-anchored diplomas; open standard | Hash-only on Bitcoin; $2+/tx; centralized UI |
| EduCTX (2018) | Full data on-chain; education-specific | Permissioned (trust consortium); centralized UI |
| Ethereum-based systems | Strong tamper resistance; public chain | $0.20–$2.00/tx; hash-only; off-chain data & UI |
| Hyperledger Fabric | High throughput (3,500 TPS); low cost | Permissioned trust; no public verifiability; centralized UI |
| W3C Verifiable Credentials | Standardized format; interoperable | Data format only — no storage/platform specification |

**Gap filled by TrustVault:** Full record on-chain + on-chain UI + designed for zero-trust BLS verification + mainnet benchmarked

### Slide 3: Design Approach, Constraints & Risks

- **Design Approach (Prototype-based):** Fully on-chain architecture on ICP — backend Motoko canister + frontend asset canister; incremental Merkle tree with Certified Variables for integrity anchoring
- **Constraints:** ICP serializes update calls (one per consensus round ~2 s); single-canister throughput ceiling ~7.3 certs/s; Wasm execution limits on canister
- **Dependencies:** DFINITY SDK (dfx ≥ 0.15), Mops package manager, ICP mainnet infrastructure, @dfinity/agent for frontend-canister communication
- **Assumptions:** ICP subnet honest-majority (<n/3 malicious replicas), SHA-256 collision resistance (for production), stable ICP cycle economics
- **Risks:** Prototype uses placeholder hashes (not SHA-256); client-side BLS verification not yet implemented; open university registration needs admin gating for production

---

## 3. Summary of Methodology / Approach

### Slide 1: Design Approach & Technologies

- **Three-pillar methodology:** (1) On-chain storage + serving eliminates all centralized points of failure, (2) Merkle tree + ICP Certified Variables provide integrity anchoring, (3) Rigorous mainnet benchmarking for empirical validation
- **Backend:** Motoko persistent actor class with 5 modules — main.mo (API), CertificateManager.mo (CRUD + hash), MerkleTree.mo (flat-array binary tree), Utils.mo (hex encoding, XOR combine), PerformanceMetrics.mo (telemetry)
- **Frontend:** React 18 SPA with 3 portal tabs (Verify, Issue, Lookup); Vite 4 build; MUI v7 dark theme; deep-link URL support for shareable verification links
- **Evaluation:** All benchmarks on live ICP mainnet from Bengaluru (~50–80 ms RTT); 3 repetitions per data point; statistical reporting (mean, stddev, p50/p95/p99)
- **Technologies:** Motoko, WebAssembly, React 18, Vite 4, Material UI v7, @dfinity/agent v3, Ed25519 cryptographic identities, Node.js benchmark suite

### Slide 2: Alternative Approaches Considered

- **Ethereum was rejected** due to gas costs ($0.20–$2.00/credential vs. $0.00002 on ICP) and inability to serve frontend from the blockchain
- **Hyperledger Fabric was rejected** as it requires a trusted consortium — contradicts the zero-trust goal; also cannot serve a public verification UI
- **IPFS + Ethereum hybrid was rejected** because off-chain data storage reintroduces centralization and single points of failure
- **ICP was chosen** because it uniquely supports on-chain web serving (HTTP gateway), Certified Variables (threshold BLS signing), and low-cost full data storage
- **Advantage of ICP:** Only platform enabling both data and UI fully on-chain with built-in cryptographic verification primitives at <$0.001/credential

---

## 4. Design Description

### Slide 1: System Architecture & Logical Workflow

- **Two-canister architecture:** Backend canister (Motoko, WebAssembly) handles all logic + data; Frontend canister (asset canister) serves React SPA over HTTPS directly from the blockchain
- **Issuance flow:** University Portal → `issueCertificate()` (update call) → access control check → create record → compute hash → Merkle insertLeaf O(log n) → `CertifiedData.set(root)` → BLS-signed by subnet → return cert ID + shareable link
- **Verification flow:** Verification Portal → `verifyCertificate(id)` (query call) → lookup cert → recompute hash → generate Merkle proof → return VerificationResult (is_valid, certificate, proof, root, message)
- **Revocation flow:** `revokeCertificate(id)` → set `is_revoked = true` → full Merkle rebuild O(n) → commit new certified root → previous proofs invalidated within ~2 s
- **Merkle tree algorithm:** Flat-array complete binary tree; index 0 = root; children of node i at 2i+1, 2i+2; insertLeaf walks path to root recomputing hashes; tree doubles capacity when full

### Slide 2: UML Diagrams Overview

- **Use Cases:** (1) University registers → issues credentials → revokes credentials, (2) Employer/Verifier verifies credential by ID (no auth), (3) Student looks up all credentials by student ID, (4) System auto-computes hashes + Merkle proofs
- **Class Structure:** `AcademicCredentialSystem` (actor) aggregates → `CertificateManager`, `MerkleTree`, `PerformanceMetrics`, `Utils`; Data types: `Certificate`, `VerificationResult`, `TreeState`, `MetricEntry` defined in `Types.mo`
- **Sequence (Issuance):** User → UniversityPortal → HttpAgent → Backend.issueCertificate() → CertMgr.createCertificate() → MerkleTree.insertLeaf() → CertifiedData.set() → return certId
- **Sequence (Verification):** User → VerificationPortal → HttpAgent → Backend.verifyCertificate() → MerkleTree.getProof() → CertMgr.verifyCertificate() → return VerificationResult
- **Deployment:** ICP Mainnet Subnet → Backend Canister (Wasm) + Frontend Canister (static assets); Client browser ↔ ICP HTTP Gateway ↔ Canister; CI/CD via GitHub Actions + `dfx deploy --network ic`

---

## 5. Modules and Implementation Details

### Slide 1: Module Overview

| Module | Technology | Purpose |
|---|---|---|
| `main.mo` | Motoko | Actor entry point; exposes all 20+ public API methods; manages state (HashMaps, Buffers); handles preupgrade/postupgrade |
| `CertificateManager.mo` | Motoko | Certificate CRUD; `computeCertificateHash()` (7-field concatenation → hex); `verifyCertificate()` (hash recomputation + comparison) |
| `MerkleTree.mo` | Motoko | Flat-array binary Merkle tree; `insertLeaf` O(log n); `buildFromCerts` O(n); `getProof` O(n) scan + O(log n) walk; `verifyProof` O(log n) |
| `Utils.mo` | Motoko | `bytesToHex` (single-pass Array.tabulate); `combineHashes` (XOR 32-byte); `textTo32ByteBlob` (truncate/pad to 32 bytes for CertifiedData) |
| `PerformanceMetrics.mo` | Motoko | Records telemetry per operation; calculates summary stats (avg/min/max in μs); capped buffer at 1,000 entries; ops/s and percentile calculations |

### Slide 2: Frontend Modules & Benchmark Suite

| Module | Technology | Purpose |
|---|---|---|
| `App.jsx` | React 18 + MUI v7 | Root component; dark theme (`#07071a`); tab routing for 3 portals; deep-link URL hash parsing |
| `VerificationPortal.jsx` | React + @dfinity/agent | Builds HttpAgent; calls `verifyCertificate()` query; displays status banner, cert details, Merkle proof, certified data hex |
| `UniversityPortal.jsx` | React + localStorage | University registration; auto-generates cert IDs (`{year}-{SLUG}-{RANDOM}`); calls `issueCertificate()` update; generates shareable verification links |
| `StudentPortal.jsx` | React | Calls `getCertificatesByStudent()` query; displays certs with VERIFIED/REVOKED status chips; JSON download + copy cert ID |
| Benchmark Suite (`benchmarks/`) | Node.js + @dfinity/agent | 4 suites: scalability (issuance), concurrency (verification), finality (mixed workload), stress (throughput); persistent Ed25519 identity; JSON result output |

---

## 6. Test Plan and Strategy

### Slide 1: Test Plan

- **Unit Testing:** Motoko unit tests via `mops test` (CI/CD on GitHub Actions); tests for hash computation, Merkle tree insertion, proof generation, and verification logic
- **Integration Testing:** End-to-end tests using local ICP replica (`dfx start --background` → `dfx deploy`); tests issuance → verification → revocation → re-verification flow
- **Mainnet Benchmarking:** 4 dedicated benchmark suites executed against live canister on ICP mainnet; 3 repetitions per data point with statistical rigor (mean, stddev, p50/p95/p99)
- **Stress Testing:** 30-second sustained issuance, 100-simultaneous-call peak burst (100/100 success, 0% error), Merkle growth at batch sizes [1, 10, 50, 100]
- **Concurrency Testing:** Mixed 30% update / 70% query workload at C = [1, 5, 10, 25, 50] simultaneous callers; block finality measured across 20 independent samples

### Slide 2: Test Strategy & Tools

- **Benchmark Scales:** Issuance N = [1, 10, 50, 100]; Verification N = [1, 10, 100, 500]; Concurrency C = [1, 5, 10, 25, 50]; 2 warmup calls; 3 repeats per N
- **Tools:** `mops test` (Motoko unit tests), `dfx` CLI (local replica testing), Node.js benchmark suite with `@dfinity/agent` (mainnet benchmarks), Python + matplotlib (graph generation)
- **Test Environment:** ICP Mainnet (ic0.app), canister `pekzw-diaaa-aaaad-afh3q-cai`, benchmark client in Bengaluru India (~50–80 ms RTT), persistent Ed25519 identity
- **Security Testing:** Threat model analysis covering 5 adversary types (malicious issuer, tampered storage, MITM, replay, compromised nodes); each mapped to specific countermeasures
- **Acceptance Criteria:** Issuance < 3 s ✓, Verification < 1 s ✓, Throughput > 5 certs/s ✓, 0% error rate at all concurrency levels ✓, <10% scaling degradation ✓

---

## 7. Results and Discussion

### Slide 1: Key Performance Results

| Metric | Result |
|---|---|
| Single issuance latency | ~1.9 s (consensus round-trip) |
| Verification latency | 60–937 ms (p99), free query call |
| Parallel throughput (N=100) | 7.3 certs/s |
| Concurrent mixed-load (C=50) | 13.1 ops/s, 0% errors |
| Block finality | 2.40 s mean, p99 < 3.05 s |
| Issuance cost | ~$0.00002/cert (8–17 M cycles) |
| Peak burst (100 simultaneous) | 100/100 success |

- O(log n) scaling confirmed: <10% throughput degradation between fresh DB and 3,280+ certificate DB
- Sustained 30 s issuance: stable 0.57 certs/s with no degradation over time
- Concurrent verification: 112.44 queries/s at 500 simultaneous queries

### Slide 2: Cross-Platform Comparison & Discussion

| Metric | ICP (TrustVault) | Ethereum PoS | Hyperledger Fabric |
|---|---|---|---|
| Block finality | **2.40 s** | ~24 s | <1 s |
| Throughput | 7.3 certs/s | 15–30 TPS | ~3,500 TPS |
| Issuance cost | **~$0.00002** | $0.20–$2.00 | Near-zero |
| Frontend on-chain | **Yes** | No | No |
| Trust model | **Designed zero-trust** | Zero-trust | Permissioned |

- TrustVault is 10× faster in finality than Ethereum and >10,000× cheaper per credential
- Fabric has higher raw throughput but requires trusting a consortium — fundamentally different security model
- TrustVault is the only system with both data and verification UI fully on-chain with reproducible mainnet benchmarks
- **Scalability projections:** Small university (1K grads) → 2.3 min at $0.02; Large university (50K) → 1.9 hrs at $1; National system (1M) → ~4 hrs with 10 canisters at ~$20
- **Future work:** SHA-256 hash hardening, client-side BLS verification, multi-canister sharding, NNS-governed university registration
