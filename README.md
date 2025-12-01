# 🎓 Trustless Academic Credential Verification

A blockchain-based system for verifying academic credentials using **Internet Computer Protocol (ICP) certified variables** - enabling cryptographically proven verification without trusting the frontend.

## 🔒 Why Trustless?

Traditional verification systems require trusting a server, API, or portal. This system uses **ICP's certified variables** to provide mathematical proof of authenticity:

- ✅ **Cryptographic Proof** - Certificates include Merkle tree proofs signed by IC subnet nodes
- ✅ **No Trust Required** - Even a compromised frontend cannot fake verification results
- ✅ **Client-Side Verification** - Your browser verifies signatures against IC's root public key
- ✅ **Fully On-Chain** - Both frontend and backend run entirely on the blockchain

**Deep Dive:** See [TRUSTLESS_VERIFICATION.md](./TRUSTLESS_VERIFICATION.md) for technical details.

---

## 🚀 Quick Start

### Prerequisites
- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (v0.15.0+)
- Node.js (v16+) and npm (v7+)

### Installation

```bash
# Install dependencies
npm install
cd src/hello_frontend && npm install && cd ../..

# Start local IC replica
dfx start --background

# Deploy canisters
dfx deploy
```

**Access:** http://u6s2n-gx777-77774-qaaba-cai.localhost:4943/

---

## 📖 How It Works

### 1. Certificate Issuance (University Portal)
University issues certificate → Stored on blockchain → Certified data updated → Merkle tree created & signed

### 2. Trustless Verification (Verification Portal)
Verifier queries certificate → Returns data + proof → Browser verifies signature → ✅ Valid or ❌ Invalid

### 3. Certificate Lookup (Student Portal)
Students search and view certificates by student ID.

---

## 🏗️ Architecture

**Backend (Motoko)**
- Certificate storage (HashMap)
- Certified variables (CertifiedData API)
- Role-based authorization

**Frontend (React + MUI)**
- University Portal
- Verification Portal  
- Student Portal

---

## 🔐 Security

### Cryptographic Protection
- **Certified Queries** - Fast verification with pre-signed Merkle proofs
- **Threshold Signatures** - 2/3+ IC subnet nodes must sign
- **Tamper Detection** - Data modification breaks signatures
- **Client Verification** - No server trust needed

### Independent Verification

```bash
# DFX CLI
dfx canister call credential_backend verifyCertificate '("CERT-ID")'

# Candid UI
http://127.0.0.1:4943/?canisterId=uzt4z-lp777-77774-qaabq-cai&id=uxrrr-q7777-77774-qaaaq-cai
```

---

## 💡 Use Cases

- Employment verification
- University transfers
- Professional licensing
- Immigration credentials

---

## 📚 Documentation

**[TRUSTLESS_VERIFICATION.md](./TRUSTLESS_VERIFICATION.md)** - Technical explanation of cryptographic security

---

## 🛠️ Development

```bash
# Build
dfx build credential_backend

# Deploy to mainnet
dfx deploy --network ic
```

---

**Built on Internet Computer Protocol** - *Cryptographically proven credentials, no trust required.*
