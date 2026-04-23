# TABLE OF CONTENTS

| | | Page No. |
|---|---|---:|
| | **ABSTRACT** | i |
| | **TABLE OF CONTENTS** | ii |
| | **LIST OF TABLES** | v |
| | **LIST OF FIGURES** | vi |
| | | |
| **CHAPTER 1** | **INTRODUCTION** | **1** |
| 1.1 | Problem Statement | 1 |
| 1.2 | Motivation | 2 |
| 1.3 | Proposed Solution | 3 |
| 1.4 | Contributions | 4 |
| 1.5 | Project Identity | 5 |
| | | |
| **CHAPTER 2** | **LITERATURE SURVEY** | **6** |
| 2.1 | Academic Credential Fraud | 6 |
| 2.2 | Blockchain Basics | 7 |
| 2.3 | MIT Digital Diplomas and Blockcerts | 8 |
| 2.4 | EduCTX | 8 |
| 2.5 | Ethereum-Based Credential Systems | 9 |
| 2.6 | W3C Verifiable Credentials | 9 |
| 2.7 | Self-Sovereign Identity and Decentralized Identifiers | 10 |
| 2.8 | Blockchain Timestamping for Academic Documents | 10 |
| 2.9 | Systematic Reviews | 11 |
| 2.10 | Gap Analysis and Comparison | 11 |
| | | |
| **CHAPTER 3** | **SYSTEM REQUIREMENTS SPECIFICATION** | **13** |
| 3.1 | Functional Requirements | 13 |
| 3.2 | Non-Functional Requirements | 15 |
| 3.3 | Hardware and Software Requirements | 16 |
| 3.4 | Use Case Descriptions | 17 |
| | | |
| **CHAPTER 4** | **SYSTEM DESIGN** | **19** |
| 4.1 | High-Level Architecture | 19 |
| 4.2 | Backend Module Design | 20 |
| 4.3 | Data Model | 21 |
| 4.4 | Incremental Merkle Tree Design | 22 |
| 4.5 | Trustless Verification Protocol (Design) | 24 |
| 4.6 | Access Control | 25 |
| 4.7 | Frontend Design | 26 |
| 4.8 | API Design | 27 |
| 4.9 | Canister Upgrade Safety | 28 |
| | | |
| **CHAPTER 5** | **IMPLEMENTATION** | **29** |
| 5.1 | Technology Stack | 29 |
| 5.2 | Repository Structure | 30 |
| 5.3 | Key Implementation Details | 31 |
|     | 5.3.1 Certificate Hash Computation | 31 |
|     | 5.3.2 Hex Encoding (Utils.mo) | 32 |
|     | 5.3.3 Hash Combination (Utils.mo) | 32 |
|     | 5.3.4 Merkle Leaf Insertion | 32 |
|     | 5.3.5 Issuance Flow (Simplified) | 33 |
|     | 5.3.6 Verification Flow (Simplified) | 33 |
|     | 5.3.7 Performance Monitoring | 34 |
| 5.4 | Deployment | 34 |
|     | 5.4.1 Local Development | 34 |
|     | 5.4.2 Mainnet Deployment | 35 |
| 5.5 | Benchmark Suite Implementation | 36 |
| 5.6 | CI/CD | 37 |
| | | |
| **CHAPTER 6** | **PROPOSED METHODOLOGY** | **38** |
| 6.1 | Overview | 38 |
| 6.2 | On-Chain Architecture Methodology | 38 |
| 6.3 | Cryptographic Integrity Methodology | 39 |
| 6.4 | Evaluation Methodology | 41 |
| 6.5 | Security Analysis Methodology | 42 |
| 6.6 | Research Output Methodology | 43 |
| | | |
| **CHAPTER 7** | **TESTING AND RESULTS** | **44** |
| 7.1 | Issuance Latency | 44 |
|     | 7.1.1 Sequential Issuance | 44 |
|     | 7.1.2 Parallel (Burst) Issuance | 45 |
| 7.2 | Verification Latency | 46 |
|     | 7.2.1 Sequential Verification | 46 |
|     | 7.2.2 Concurrent Verification | 47 |
|     | 7.2.3 Lookup Benchmarks | 47 |
| 7.3 | Throughput and Scalability | 48 |
|     | 7.3.1 Fresh vs. Large Database Comparison | 48 |
|     | 7.3.2 Sustained Issuance | 49 |
|     | 7.3.3 Merkle Tree Growth | 49 |
|     | 7.3.4 Peak Burst | 50 |
| 7.4 | Concurrent Mixed Workload | 50 |
|     | 7.4.1 Block Finality | 50 |
|     | 7.4.2 Mixed Workload Throughput | 51 |
| 7.5 | Cross-Platform Comparison | 52 |
| 7.6 | Cost Analysis | 53 |
| 7.7 | Scalability Projections | 54 |
| 7.8 | Security Analysis Results | 54 |
|     | 7.8.1 Threat Model | 54 |
|     | 7.8.2 Security Guarantees (Designed for Production with SHA-256) | 55 |
|     | 7.8.3 Trust Assumptions | 56 |
|     | 7.8.4 Prototype Limitations | 56 |
| | | |
| **CHAPTER 8** | **SNAPSHOTS** | **57** |
| 8.1 | System Architecture Diagram | 57 |
| 8.2 | Merkle Tree Structure | 58 |
| 8.3 | Verification Flow | 59 |
| 8.4 | Issuance Workflow | 60 |
| 8.5 | Key Performance Metrics Summary | 61 |
| 8.6 | Benchmark Configuration | 62 |
| | | |
| **CHAPTER 9** | **CONCLUSION AND FUTURE WORK** | **63** |
| 9.1 | Conclusion | 63 |
| 9.2 | Limitations | 64 |
| 9.3 | Future Work | 65 |
| | | |
| | **REFERENCES** | **67** |
| | | |
| | **APPENDIX A: DEFINITIONS, ACRONYMS AND ABBREVIATIONS** | **69** |
