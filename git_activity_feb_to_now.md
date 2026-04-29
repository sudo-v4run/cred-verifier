# Git Commit Activity — February 2026 to April 2026

**Repository:** TrustVault (Blockchain Credential System)  
**Author:** sudo-v4run  
**Period:** Feb 04, 2026 – Apr 28, 2026  
**Total:** 57 commits · 3 months of active development

---

## Activity Timeline

```
Feb 2026   ██ Feb 04 (×2)                    ██ Feb 26 (×1)
Mar 2026   ███ Mar 02 (×3)  ██ Mar 03 (×2)  ██ Mar 06 (×3)  █ Mar 07  █ Mar 09  ████ Mar 12 (×4)  ████ Mar 24 (×4)  █ Mar 25
Apr 2026   ████ Apr 15 (×4)  ████ Apr 18 (×4)  ██ Apr 21 (×2)  ████████████████████ Apr 22 (×18)  ███ Apr 23 (×3)  █ Apr 28
```

---

## Full Commit Table — Feb 04 to Apr 28, 2026

| # | Hash | Date | Files | +Added | −Removed | Category | Summary |
|---|------|------|:-----:|:------:|:--------:|----------|---------|
| 1 | `4be2955` | Feb 04 | 36 | +4,572 | −404 | 🏗️ Backend/Structure | Major restructure: new Motoko backend (`main.mo`, `MerkleTree.mo`, `CertificateManager.mo`, `PerformanceMetrics.mo`), docs, benchmark scripts, frontend reorganized |
| 2 | `28a4e2d` | Feb 04 | 9 | +599 | −422 | 🔧 Benchmarks | Benchmark scripts enhanced (`stress_test.sh` +239 lines), concurrency config added, dependencies updated |
| 3 | `ea57753` | Feb 26 | 49 | +7,747 | −1,215 | 🔧 Benchmarks | Full benchmark suite rewrite (modular JS), 8 publication figures generated, backend/frontend refinements |
| 4 | `c8107df` | Mar 02 | 13 | +10,825 | −882 | 🎨 Frontend | Major frontend overhaul: all 3 portals rewritten, benchmark stress test added, 4 new result JSON files |
| 5 | `a3a808b` | Mar 02 | 11 | +859 | −1,096 | 🔧 Benchmarks | Benchmark suite refactored (run.js, concurrency, finality, scalability, stress modules), frontend VerificationPortal updated |
| 6 | `eef84ff` | Mar 02 | 3 | +774 | −949 | 🔧 Benchmarks | Shareable verification URLs added; mainnet benchmark suite restructured; graph generator overhauled |
| 7 | `35f03e7` | Mar 03 | 2 | +26 | −5 | 🎨 Frontend | UniversityPortal & VerificationPortal UI fixes pre-deploy |
| 8 | `60eda1c` | Mar 03 | 21 | +259 | −10,204 | 🧹 Cleanup | Pre-deploy cleanup: removed old docs, stale benchmark results, dashboard.html; updated frontend portals |
| 9 | `ec2202c` | Mar 06 | 7 | +841 | −131 | 🐛 Fix | Fixed excessive cycles usage in MerkleTree; added benchmark logs and canister IDs |
| 10 | `6abd74b` | Mar 06 | 19 | +8,470 | −95 | 🔧 Benchmarks | Saved live mainnet test results (issuance, verification, concurrent, throughput); benchmark suite fixes |
| 11 | `f5d1a2d` | Mar 06 | 4 | +3,505 | 0 | 🔧 Benchmarks | Saved canonical mainnet benchmark results with clean filenames |
| 12 | `c0dfad2` | Mar 07 | 26 | +5,918 | −228 | 📄 Paper | Initial research paper (`research_paper.tex` +701 lines), 10 benchmark figures added, dashboard updated |
| 13 | `d46ed15` | Mar 09 | 6 | +512 | −103 | 📄 Paper | Research paper expanded significantly (+397 lines to tex), figures updated |
| 14 | `011f200` | Mar 10 | 36 | +109 | −46 | 📄 Paper / 🔧 Benchmarks | Corrected metric values in paper; regenerated 10 figures; added burst analysis figure (Fig09) |
| 15 | `a5f03fd` | Mar 12 | 5 | +643 | −319 | 📄 Paper | Research paper major rewrite (+516 lines), compressed to fit page limits |
| 16 | `2a01c31` | Mar 12 | 4 | +65 | −65 | 📄 Paper | Compressed paper to 4 pages with modified images |
| 17 | `fe94e65` | Mar 12 | 4 | +53 | −70 | 📄 Paper | Simplified figure labels and captions |
| 18 | `a06be73` | Mar 12 | 4 | +30 | −1 | ⚙️ Config | Fixed "base not defined" error; added GitHub Actions workflow, `.gitignore`, `mops.toml` |
| 19 | `220950e` | Mar 24 | 6 | +4,024 | 0 | 📄 Paper | Added journal paper (`journal_paper.tex` +1,131 lines, PDF), backup of conference paper |
| 20 | `ee8c150` | Mar 24 | 5 | +86 | −85 | 📄 Paper | Journal paper validated and refined |
| 21 | `6c074dd` | Mar 24 | 3 | +35 | −34 | 📄 Paper | Fixed Figure 2 in journal paper |
| 22 | `df998c2` | Mar 24 | 1 | +61 | −8 | 📄 Paper | Added standalone Security Analysis section (§VI) to journal paper |
| 23 | `8a557bd` | Mar 25 | 4 | +145 | −126 | 📄 Paper | Security analysis finalized; journal paper aux/log/out updated |
| 24 | `7beb788` | Apr 15 | 1 | +11 | −8 | 📄 Paper | Edited conference paper tex |
| 25 | `33b98d0` | Apr 15 | 1 | +2 | −2 | 📄 Paper | Updated research_paper.tex |
| 26 | `e5be19e` | Apr 15 | 6 | +111 | −92 | 📄 Paper | Updated author details in journal paper |
| 27 | `a12d669` | Apr 15 | 4 | +43 | −50 | 📄 Paper | Fixed journal paper authors |
| 28 | `2ef7e8b` | Apr 18 | 21 | 0 | −7,659 | 🧹 Cleanup | Restructured folder: moved Paper/ files, removed old benchmark results, logs, and docs |
| 29 | `5dcb1a8` | Apr 18 | 1 | +563 | 0 | 📝 Docs | Added `context.md` file (+563 lines) |
| 30 | `c95c04b` | Apr 18 | 5 | +76 | −1,587 | 🧹 Cleanup | Cleaned up both papers, removed backup tex, fixed graph generator |
| 31 | `46bcce2` | Apr 18 | 43 | +83 | −10,947 | 🧹 Cleanup | Removed LaTeX aux/log/out files, stale benchmark JSONs; regenerated 10 figures |
| 32 | `ec2b266` | Apr 21 | 4 | +43 | −937 | 📄 Paper | Enhanced TrustVault paper: refined contributions, expanded security analysis, clarified performance metrics |
| 33 | `3c1a35f` | Apr 21 | 4 | +16 | −1 | 📄 Paper | Fixed accuracy issues: disclosed prototype hashing, open registration, cycles cost |
| 34 | `122b546` | Apr 22 | 4 | 0 | 0 | 🧹 Cleanup | Renamed `Paper/` directory to `papers/` |
| 35 | `794e9ba` | Apr 22 | 4 | +12 | −6 | 📄 Paper | Refined accuracy disclosures: prototype intent and cost estimation in both papers |
| 36 | `86efe12` | Apr 22 | 4 | +62 | −16 | 📄 Paper | Corrected issuance cost from $0.001 to ~$0.00002 in both papers |
| 37 | `8f68668` | Apr 22 | 3 | +1,269 | −15 | 📄 Paper | Fixed journal: footnote pointer, table overflow, hash formula |
| 38 | `191b99b` | Apr 22 | 3 | +51 | −55 | 📄 Paper | Fixed journal: column overflow in 3 locations |
| 39 | `04d82ee` | Apr 22 | 3 | +76 | −77 | 📄 Paper | Fixed journal: compacted H_proto equation to fit single column |
| 40 | `c1eb33f` | Apr 22 | 3 | +27 | −12 | 📄 Paper | Fixed journal: constrained schema table description column width |
| 41 | `9b17bbb` | Apr 22 | 6 | +1,176 | −51 | 📄 Paper | Thorough code-paper consistency audit across both papers |
| 42 | `d6c9f75` | Apr 22 | 1 | +1 | −1 | 📄 Paper | Conference: trimmed footnote (removed revision history) |
| 43 | `c7ee3b6` | Apr 22 | 1 | +2 | −1 | 📄 Paper | Journal: removed revision history from cost estimate; moved cycle instrumentation to Future Work |
| 44 | `8051138` | Apr 22 | 1 | +1 | −1 | 📄 Paper | Journal: shortened `countInstructions` identifier to prevent column overflow |
| 45 | `76ef701` | Apr 22 | 1 | +3 | −2 | 📄 Paper | Journal: schema table description column auto-fills via tabularx |
| 46 | `57bc50c` | Apr 22 | 7 | +69 | −2,377 | 🧹 Cleanup | Added `mops.lock`, updated `mops.toml`, added PDFs; removed LaTeX log files from tracking |
| 47 | `02bd779` | Apr 22 | 1 | +2 | −1 | 📝 Docs | Updated `context.md`: removed core dependency, added mops.lock to repo layout |
| 48 | `8dfac27` | Apr 22 | 1 | +229 | 0 | 📝 Docs | Added `README.md` (+229 lines) |
| 49 | `ee95b21` | Apr 22 | 2 | +2 | −2 | 📄 Paper | Conference: A4 page size fix; expanded abstract to 161 words |
| 50 | `6a0a0fd` | Apr 22 | 2 | +4 | −4 | 📄 Paper | Conference: past-tense deployment/benchmark claims |
| 51 | `0f4ca87` | Apr 22 | 2 | +3 | −3 | 📄 Paper | Journal: past-tense deployment claims |
| 52 | `69dd250` | Apr 22 | 1 | +1 | −1 | 📄 Paper | Conference: removed stale cleveref from header comment |
| 53 | `582913b` | Apr 22 | 2 | +2 | −2 | 📄 Paper | Conference: removed 'live' database claim; past-tense 'was achieved' |
| 54 | `d9b12cc` | Apr 22 | 2 | +1 | −1 | 📄 Paper | Conference: fixed abstract (removed canister ID, fixed 'serving frontend') |
| 55 | `5debc2f` | Apr 22 | 2 | +1 | −1 | 📄 Paper | Journal: abstract past-tense fixes, 'website' → 'verification interface' |
| 56 | `58b5b41` | Apr 23 | 1 | +1,211 | 0 | 📝 Docs | Added `report.md` (+1,211 lines) |
| 57 | `82691c6` | Apr 23 | 2 | +291 | 0 | 📝 Docs | Added `ESA.md` and `TOC.md` |
| 58 | `e50860e` | Apr 23 | 3 | +18 | −3 | 🐛 Fix | Fixed deprecated issues in frontend tsconfig and package-lock |
| 59 | `4d20a64` | Apr 28 | 2 | +1 | −112 | 📄 Paper | Updated abstract; removed TOC.md content |

---

## Monthly Summary

| Month | Commits | Files Changed | Lines Added | Lines Removed | Net Change | Focus |
|-------|:-------:|:-------------:|:-----------:|:-------------:|:----------:|-------|
| **February 2026** | 3 | 94 | +12,918 | −2,041 | **+10,877** | Backend implementation, benchmark suite setup |
| **March 2026** | 16 | ~170 | +35,786 | −13,978 | **+21,808** | Mainnet deployment, benchmarking, research paper |
| **April 2026** | 40 | ~180 | +6,263 | −23,972 | **−17,709** | Paper refinement, cleanup, documentation |
| **TOTAL** | **59** | **~444** | **~54,967** | **~39,991** | **+14,976** | |

---

## Commit Categories Breakdown

| Category | Count | Description |
|----------|:-----:|-------------|
| 📄 Paper | 30 | Research paper writing, editing, formatting (conference + journal) |
| 🔧 Benchmarks | 9 | Benchmark suite development, mainnet runs, result collection |
| 🧹 Cleanup | 7 | Folder restructuring, removing stale files, LaTeX artifacts |
| 🏗️ Backend/Structure | 3 | Motoko backend, project architecture |
| 🎨 Frontend | 3 | React portals, UI components |
| 📝 Docs | 4 | README, context.md, report.md, ESA.md |
| 🐛 Fix | 2 | Bug fixes (cycles, deprecated issues) |
| ⚙️ Config | 1 | GitHub Actions, mops config |

---

## Change Volume by Month (Visual)

```
                Lines Added          Lines Removed
                ───────────────────────────────────────────────────
February 2026   ████████████████████████████████  +12,918
                █████  −2,041

March 2026      ████████████████████████████████████████████████████████████████████████████████████████  +35,786
                ████████████████████████████████████  −13,978

April 2026      ████████████████  +6,263
                ████████████████████████████████████████████████████████████  −23,972
                ───────────────────────────────────────────────────
                Each █ ≈ 400 lines
```

> April's high removal count reflects intentional cleanup: removing LaTeX build artifacts, stale benchmark JSONs, and old documentation — not lost work.

---

## Key Milestones

| Date | Milestone |
|------|-----------|
| **Feb 04, 2026** | Project restructured; full Motoko backend implemented from scratch |
| **Feb 26, 2026** | Modular benchmark suite built; first benchmark runs executed locally |
| **Mar 02, 2026** | Frontend portals completed; shareable verification URLs added |
| **Mar 03, 2026** | Pre-deployment cleanup; system prepared for mainnet |
| **Mar 06, 2026** | **Mainnet deployment** — live benchmark results collected on ICP mainnet |
| **Mar 07, 2026** | Research paper (conference) started with real benchmark data |
| **Mar 24, 2026** | Journal paper added; Security Analysis section written |
| **Apr 18, 2026** | Major repository cleanup and restructure |
| **Apr 21–22, 2026** | Intensive paper revision session (18 commits in one day) |
| **Apr 23, 2026** | Project report and ESA document added |
| **Apr 28, 2026** | Abstract updated — latest commit |

---

*Generated from `git log --after="2026-01-31" --stat` · Author: sudo-v4run*
