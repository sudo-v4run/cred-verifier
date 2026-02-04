# Module Dependency Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.mo                                 │
│                    (Main Actor - Public API)                    │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   University    │  │   Certificate    │  │  Merkle Tree │  │
│  │   Management    │  │   Management     │  │  & Certified │  │
│  │      API        │  │       API        │  │   Data API   │  │
│  └─────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
    ┌─────────┐         ┌──────────────┐        ┌─────────────┐
    │ Types.mo│         │CertManager.mo│        │MerkleTree.mo│
    │         │◄────────┤              │◄───────┤             │
    │  Type   │         │ Certificate  │        │   Merkle    │
    │  Defs   │         │   Business   │        │    Tree     │
    │         │         │    Logic     │        │  Operations │
    └─────────┘         └──────────────┘        └─────────────┘
         ▲                      │                       │
         │                      │                       │
         │                      ▼                       ▼
         │                 ┌─────────────────────────────┐
         └─────────────────┤       Utils.mo              │
                           │   Utility Functions         │
                           │  (Hash, Convert, etc.)      │
                           └─────────────────────────────┘
```

## Detailed Module Dependencies

### main.mo Dependencies
```
main.mo
  ├── Types (import)
  │   ├── Certificate
  │   ├── VerificationResult
  │   ├── MerkleNode
  │   └── CertificateId
  │
  ├── Utils (import)
  │   └── textTo32ByteBlob()
  │
  ├── MerkleTree (import)
  │   ├── buildMerkleTree()
  │   ├── getMerkleProof()
  │   └── verifyProof()
  │
  └── CertificateManager (import)
      ├── createCertificate()
      ├── verifyCertificate()
      └── revokeCertificate()
```

### CertificateManager.mo Dependencies
```
CertificateManager.mo
  ├── Types (import)
  │   ├── Certificate
  │   ├── Issuer
  │   ├── Recipient
  │   ├── Credential
  │   └── VerificationResult
  │
  └── Utils (import)
      └── bytesToHex()
```

### MerkleTree.mo Dependencies
```
MerkleTree.mo
  ├── Types (import)
  │   ├── Certificate
  │   └── MerkleNode
  │
  └── Utils (import)
      └── combineHashes()
```

### Utils.mo Dependencies
```
Utils.mo
  ├── Array (mo:base)
  ├── Nat8 (mo:base)
  ├── Text (mo:base)
  └── Blob (mo:base)
  
  (No custom module dependencies - leaf node)
```

### Types.mo Dependencies
```
Types.mo
  (No dependencies - pure type definitions)
  (Leaf node in dependency graph)
```

## Data Flow

### Certificate Issuance Flow
```
1. Client Request
   │
   ▼
2. main.mo: issueCertificate()
   │
   ├─► Validate caller is university
   │
   ├─► CertificateManager.createCertificate()
   │    │
   │    ├─► CertificateManager.computeCertificateHash()
   │    │    └─► Utils.bytesToHex()
   │    │
   │    └─► Returns Certificate
   │
   ├─► Store in HashMap
   │
   └─► updateCertifiedData()
        │
        ├─► MerkleTree.buildMerkleTree()
        │    └─► Utils.combineHashes()
        │
        └─► CertifiedData.set()
```

### Certificate Verification Flow
```
1. Client Request
   │
   ▼
2. main.mo: verifyCertificate()
   │
   ├─► Get certificate from HashMap
   │
   ├─► MerkleTree.getMerkleProof()
   │    └─► Utils.combineHashes()
   │
   └─► CertificateManager.verifyCertificate()
        │
        ├─► CertificateManager.computeCertificateHash()
        │    └─► Utils.bytesToHex()
        │
        └─► Returns VerificationResult
```

## Module Interaction Matrix

|                 | main.mo | Types | Utils | MerkleTree | CertManager |
|-----------------|---------|-------|-------|------------|-------------|
| **main.mo**     |    -    |   ✓   |   ✓   |     ✓      |      ✓      |
| **Types.mo**    |    -    |   -   |   -   |     -      |      -      |
| **Utils.mo**    |    -    |   -   |   -   |     -      |      -      |
| **MerkleTree**  |    -    |   ✓   |   ✓   |     -      |      -      |
| **CertManager** |    -    |   ✓   |   ✓   |     -      |      -      |

Legend:
- ✓ = Imports/Uses
- - = No dependency

## Layered Architecture

```
┌───────────────────────────────────────────┐
│         Layer 1: Presentation             │
│              (main.mo)                    │
│         Public API & Coordination         │
└───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│         Layer 2: Business Logic           │
│    (CertificateManager, MerkleTree)       │
│      Domain-specific Operations           │
└───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│       Layer 3: Utility & Foundation       │
│           (Utils, Types)                  │
│      Reusable Components & Types          │
└───────────────────────────────────────────┘
```

## Code Statistics

### Before Modularization
```
main.mo: 529 lines (100%)
```

### After Modularization
```
main.mo:              261 lines (49%)
Types.mo:              58 lines (11%)
Utils.mo:              59 lines (11%)
MerkleTree.mo:        172 lines (33%)
CertificateManager.mo: 120 lines (23%)
─────────────────────────────────────
Total:                670 lines (127% of original)

Note: Increased LOC due to better organization,
documentation, and clearer separation of concerns.
```

### Complexity Reduction
```
Cyclomatic Complexity per Module:
  main.mo (before):      High (all logic together)
  main.mo (after):       Low (coordination only)
  MerkleTree.mo:         Medium (focused algorithm)
  CertificateManager.mo: Low (simple operations)
  Utils.mo:              Low (pure functions)
  Types.mo:              None (type definitions)
```

## Testing Strategy

### Unit Testing
```
Types.mo:          No tests needed (type definitions)
Utils.mo:          Test each utility function independently
MerkleTree.mo:     Test tree construction and proof generation
CertManager.mo:    Test certificate operations
```

### Integration Testing
```
main.mo:           Test public API with all modules working together
```

### Test Coverage Goals
- Utils.mo: 100% (all functions are pure)
- MerkleTree.mo: 100% (critical security component)
- CertificateManager.mo: 100% (business logic)
- main.mo: 90%+ (public API coverage)

---
Created: January 29, 2026
Purpose: Visual documentation of modular architecture
