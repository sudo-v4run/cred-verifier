# Certificate Issuance and Verification System

A blockchain-based certificate management system built on the Internet Computer Protocol (ICP). Features secure certificate issuance, cryptographic verification using Merkle trees, and comprehensive performance monitoring.

## 🚀 Quick Start

```bash
# Start the local ICP replica
dfx start --background

# Deploy the canisters
dfx deploy

# Open the dashboard
open dashboard.html
```

## 📁 Project Structure

```
├── src/
│   ├── backend/              # Motoko smart contracts
│   │   ├── main.mo          # Main canister entry point
│   │   ├── Types.mo         # Type definitions
│   │   ├── Utils.mo         # Utility functions
│   │   ├── MerkleTree.mo    # Merkle tree implementation
│   │   ├── CertificateManager.mo  # Certificate logic
│   │   └── PerformanceMetrics.mo  # Performance tracking
│   ├── frontend/            # Web application (React/Vite)
│   └── declarations/        # Auto-generated Candid bindings
├── benchmarks/              # Performance testing tools
│   ├── single.sh           # Single operation benchmark
│   ├── batch_issue.sh      # Batch issuance benchmark
│   ├── batch_verify.sh     # Batch verification benchmark
│   ├── stress_test.sh      # System limits testing
│   └── README.md           # Benchmark documentation
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md     # System architecture
│   ├── MODULE_DESIGN.md    # Module design diagrams
│   ├── MERKLE_TREE.md      # Merkle tree implementation
│   ├── PERFORMANCE.md      # Performance analysis
│   ├── DASHBOARD.md        # Dashboard user guide
│   └── VERIFICATION.md     # Trustless verification
├── dashboard.html           # Performance metrics dashboard
├── dfx.json                # DFX configuration
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## 🎯 Features

- **Secure Certificate Issuance**: Universities can issue tamper-proof digital certificates
- **Merkle Tree Verification**: Efficient cryptographic proof of certificate authenticity
- **Performance Monitoring**: Real-time metrics and benchmarking tools
- **Batch Operations**: Issue and verify multiple certificates efficiently
- **Interactive Dashboard**: Visual analytics for system performance

## 📊 Performance Monitoring

### View Metrics Dashboard
```bash
open dashboard.html
```

### Run Benchmarks
```bash
# Single certificate operations
./benchmarks/single.sh

# Batch issuance (50 certificates)
./benchmarks/batch_issue.sh 50

# Batch verification (50 certificates)
./benchmarks/batch_verify.sh 50

# System stress test (finds performance limits)
./benchmarks/stress_test.sh
```

## 🔧 Development

### Prerequisites
- DFX SDK 0.29.2 or later
- Node.js 18+ and npm
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd hello

# Install dependencies
npm install

# Start local replica
dfx start --background

# Deploy canisters
dfx deploy
```

### Available Commands
```bash
# Deploy backend only
dfx deploy credential_backend

# Deploy frontend only
dfx deploy credential_frontend

# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Get metrics summary
dfx canister call credential_backend getAllMetricsSummaries '()'

# Stop local replica
dfx stop
```

## 📚 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and module structure
- **[Merkle Tree](docs/MERKLE_TREE.md)** - Cryptographic implementation details
- **[Performance](docs/PERFORMANCE.md)** - Benchmarking results and analysis
- **[Dashboard Guide](docs/DASHBOARD.md)** - How to use the metrics dashboard
- **[Folder Structure FAQ](docs/FOLDER_STRUCTURE_FAQ.md)** - Understanding project structure
- **[Benchmarks](benchmarks/README.md)** - Performance testing guide

## 🎓 Usage Examples

### Register a University
```bash
dfx canister call credential_backend registerUniversity '("MIT")'
```

### Issue a Certificate
```bash
dfx canister call credential_backend issueCertificate '(
  "CERT001",
  "MIT",
  "https://mit.edu/verify",
  "John Doe",
  "MIT2024CS001",
  "principal-xyz",
  "Bachelor of Science",
  "Computer Science",
  "2024-05-15",
  "2024-05-15",
  3.8,
  "Summa Cum Laude"
)'
```

### Verify a Certificate
```bash
dfx canister call credential_backend verifyCertificate '("CERT001")'
```

## 🚀 Performance Baseline

Based on local replica testing:

| Operation | End-to-End Time | Throughput |
|-----------|----------------|------------|
| Single Issuance | ~1200ms | 0.8 certs/sec |
| Single Verification | ~1200ms | 0.8 verif/sec |
| Batch Issuance (100) | ~125s | 0.8 certs/sec |

*Note: End-to-end time includes network latency and consensus. Internal canister execution is <1μs.*

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please read the documentation in the `docs/` folder before submitting pull requests.
