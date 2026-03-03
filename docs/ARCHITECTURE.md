# TrustVault — System Architecture

## Overview

TrustVault is a trustless academic credential verification system deployed on the Internet Computer Protocol (ICP). Certificates are stored on-chain and verifiable without trusting any central authority.

---

## Backend (Motoko)

### Module Layout

```
src/backend/
├── main.mo              # Public canister API (actor)
├── Types.mo             # Shared type definitions
├── CertificateManager.mo# Certificate creation, hashing, verification logic
├── MerkleTree.mo        # Merkle tree construction and proof generation
├── PerformanceMetrics.mo# Metrics collection and aggregation
└── Utils.mo             # SHA-256 hashing, encoding helpers
```

### Data Model

**Certificate** (stored in `HashMap<CertificateId, Certificate>`):

| Field | Type | Description |
|---|---|---|
| `certificate_id` | Text | Unique ID (e.g. `CERT-2026-ABC123`) |
| `certificate_hash` | Text | SHA-256 of core fields |
| `issuer` | `{ name, canister_id, verification_url }` | Issuing institution |
| `recipient` | `{ name, student_id, principal_id }` | Student |
| `credential` | `{ degree_type, major, gpa, honors, graduation_date, issue_date }` | Degree info |
| `is_revoked` | Bool | Revocation flag |
| `block_timestamp` | Int | Nanoseconds since epoch |
| `issuer_signature` | Text | Hash-based integrity token |
| `schema_version` | Text | Protocol version |

### Merkle Tree & Certified Data

Verification is trustless via ICP's **Certified Data** API:

1. On every issuance/revocation, the Merkle tree is rebuilt over all certificate hashes.
2. The Merkle root is stored via `CertifiedData.set()` — signed by the subnet's threshold BLS key.
3. `verifyCertificate(id)` returns the cert + its Merkle proof path.
4. A client can verify: hash(cert fields) → walk proof → matches certified root → subnet signature valid.

This means verification requires **zero trust** in the canister itself.

### Access Control

| Action | Who can call |
|---|---|
| `registerUniversity` | Any principal |
| `issueCertificate` | Registered universities only |
| `revokeCertificate` | Registered universities only |
| `verifyCertificate` | Anyone (query call) |
| `clearMetrics` | Registered universities only |

> ⚠️ Known gap: `registerUniversity` is open to any caller. For production, restrict to an admin principal or implement Internet Identity gating.

---

## Frontend (React + Vite)

```
src/frontend/src/
├── App.jsx                       # Theme, routing, tab navigation
└── components/
    ├── VerificationPortal.jsx    # Verify a certificate by ID
    ├── UniversityPortal.jsx      # Register institution + issue certificates
    └── StudentPortal.jsx         # Look up certificates by student ID
```

Communicates with the canister via the auto-generated `declarations/credential_backend` JS bindings.

---

## Benchmarks

```
benchmarks/
├── run.js               # CLI runner: --suite [all|scalability|concurrency|finality|stress]
├── suite/
│   ├── scalability.js   # Latency vs. dataset size (N certs)
│   ├── concurrency.js   # Throughput vs. concurrency level
│   ├── finality.js      # Block finality timing
│   └── stress.js        # Burst storm, sustained load, mixed workload, memory pressure
└── visualize/
    └── generate_graphs.py  # Produces publication-ready figures from results JSON
```

Run with `--dry-run` for synthetic data or against a live canister with `--network ic`.
