# 📊 Certificate Blockchain Benchmarking Suite

## Overview
Comprehensive benchmarking tools for testing single and batch certificate operations, measuring throughput, and identifying system performance limits.

## 🎯 Available Benchmarks

### 1. Single Certificate Operations (`test_single.sh`)
Tests individual certificate issuance and verification.

**Usage:**
```bash
./test_single.sh
```

**Measures:**
- Single certificate issuance time (end-to-end + canister internal)
- Single certificate verification time (end-to-end + canister internal)
- Success/failure rates

**Output:** `benchmark_single.json` (overwrites previous results)

---

### 2. Batch Certificate Issuance (`issue_batch.sh`)
Issues N certificates in sequence and measures performance.

**Usage:**
```bash
./issue_batch.sh <number_of_certificates> [university_name]

# Examples:
./issue_batch.sh 10                    # Issue 10 certificates
./issue_batch.sh 50 "MIT"              # Issue 50 certificates for MIT
./issue_batch.sh 100                   # Issue 100 certificates
```

**Measures:**
- Total time for N certificates
- Average time per certificate
- Throughput (certificates/second)
- Success/failure breakdown
- Canister internal metrics

**Output:** `benchmark_issue_<N>_<timestamp>.json` (timestamped for batch testing)

---

### 3. Batch Certificate Verification (`verify_batch.sh`)
Verifies N certificates in sequence and measures performance.

**Usage:**
```bash
./verify_batch.sh <number_of_certificates> [prefix]

# Examples:
./verify_batch.sh 10                    # Verify 10 certificates
./verify_batch.sh 50 BENCH_ISSUE        # Verify 50 certificates with prefix
```

**Measures:**
- Total verification time
- Average time per verification
- Throughput (verifications/second)
- Success/failure breakdown
- Canister internal metrics

**Output:** `benchmark_verify_<N>_<timestamp>.json` (timestamped for batch testing)

---

### 4. System Limits Testing (`stress_test.sh`)
Tests increasing batch sizes to find performance degradation points.
**Uses PARALLEL execution to simulate concurrent users and test scalability.**

**Usage:**
```bash
# Default: up to 50 concurrent requests
./stress_test.sh

# Custom concurrency levels:
CONCURRENCY=10 ./stress_test.sh     # Light load: 10 concurrent requests
CONCURRENCY=100 ./stress_test.sh    # Medium load: 100 concurrent requests
CONCURRENCY=200 ./stress_test.sh    # Heavy load: 200 concurrent requests
CONCURRENCY=500 ./stress_test.sh    # Extreme load: 500 concurrent requests

# Export for multiple runs:
export CONCURRENCY=100
./stress_test.sh                    # Uses CONCURRENCY=100
./stress_test.sh                    # Still uses CONCURRENCY=100
```

**Tests batch sizes:** 1, 5, 10, 20, 50, 100, 200, 500, 1000

**Features:**
- **Parallel execution**: Simulates real-world concurrent user load
- **Configurable concurrency**: Control how many requests run simultaneously
- **Scalability testing**: Tests how system handles concurrent operations

**Measures:**
- Performance at each batch size under concurrent load
- Average time per operation
- Throughput at each scale
- Identifies slowdown points (>2x degradation)
- Maximum supported batch size
- Success/failure rates under concurrent load

**Output:** `benchmark_concurrency.json` (overwrites previous results)

**Visualizes:** Performance degradation graph showing when system slows significantly under concurrent load

**Note:** This benchmark issues certificates in parallel (not sequentially) to better simulate real-world scenarios where multiple users request certificates simultaneously. This tests the system's ability to handle concurrent operations and identify scalability bottlenecks.

---

## 📈 Dashboard Integration

All benchmark results are automatically saved as JSON files and can be visualized in the metrics dashboard.

**To view results:**
1. Run any benchmark script
2. Open `../metrics_dashboard.html` in your browser
3. Click "Refresh Data" or wait for auto-refresh
4. View comprehensive charts and analysis

---

## 🎯 Understanding the Metrics

### End-to-End Time
- Includes network latency + ICP consensus + canister execution
- Typical range: 1000-1500ms per operation (sequential)
- **What it measures:** Real user experience

### Parallel Execution Time
- Wall-clock time for concurrent operations
- With parallel execution, total time is much less than sequential
- Example: 100 certificates in parallel might take ~5-10s instead of ~125s
- **What it measures:** System scalability under concurrent load

### Canister Internal Time
- Pure computation time inside the canister
- Typical range: 0-10μs (sub-microsecond)
- **What it measures:** Code efficiency

### Throughput
- Operations per second
- Sequential: Typical range: 0.7-0.9 ops/sec
- Parallel: Can be much higher (depends on concurrency level)
- **What it measures:** System capacity

### Success Rate
- Percentage of successful operations
- Target: >95%
- **What it measures:** System reliability under load

---

## 📊 Benchmark Workflow Examples

### Example 1: Quick Performance Check
```bash
# Test single operations
./test_single.sh

# Test small batch
./issue_batch.sh 10
./verify_batch.sh 10

# View results in dashboard
```

### Example 2: Capacity Testing
```bash
# Find system limits
./test_limits.sh

# This will test: 1, 5, 10, 20, 50, 100, 200, 500, 1000 certificates
# And show where performance degrades
```

### Example 3: Comparing Batch Sizes
```bash
# Test different scales
./issue_batch.sh 10
./issue_batch.sh 50
./issue_batch.sh 100

# Compare throughput in dashboard
```

### Example 4: Stress Testing (Concurrent Load)
```bash
# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Run stress test with parallel execution (simulates concurrent users)
./stress_test.sh

# Or with custom concurrency level
CONCURRENCY=100 ./stress_test.sh

# This tests: 1, 5, 10, 20, 50, 100, 200, 500, 1000 certificates
# Each batch is issued in PARALLEL to simulate concurrent users
# Analyze results to see how system scales under concurrent load
```

---

## 📁 Output File Format

**Main Benchmark Files (Fixed Names):**
- `benchmark_single.json` - Single certificate test results (overwrites on each run)
- `benchmark_concurrency.json` - Concurrency/stress test results (overwrites on each run)

**Helper Batch Files (Timestamped):**
- `benchmark_issue_<N>_<timestamp>.json` - Individual batch issuance tests
- `benchmark_verify_<N>_<timestamp>.json` - Individual batch verification tests

All benchmarks generate JSON files with this structure:

```json
{
  "benchmark_type": "batch_issuance",
  "timestamp": "1738673400",
  "date": "2026-02-04T10:30:00+00:00",
  "parameters": {
    "certificate_count": 50
  },
  "end_to_end_metrics": {
    "total_time_ms": 62500,
    "total_time_s": 62.5,
    "avg_time_per_cert_ms": 1250,
    "throughput_certs_per_sec": 0.8
  },
  "canister_metrics": {
    "total_operations": 50,
    "successful_operations": 50,
    "failed_operations": 0,
    "avg_duration_us": 0.5
  }
}
```

---

## 🎯 Performance Baselines

Based on ICP local replica testing:

| Operation | End-to-End | Canister Internal | Throughput |
|-----------|------------|-------------------|------------|
| Single Issuance | ~1200ms | <1μs | 0.8 certs/sec |
| Single Verification | ~1200ms | <1μs | 0.8 verif/sec |
| Batch Issuance (10) | ~12s total | <1μs each | 0.8 certs/sec |
| Batch Issuance (100) | ~125s total | <1μs each | 0.8 certs/sec |

**Note:** End-to-end time dominated by network + consensus, not computation

---

## 🚀 Tips for Accurate Benchmarking

1. **Clear metrics between runs:**
   ```bash
   dfx canister call credential_backend clearMetrics '()'
   ```

2. **Ensure dfx is running:**
   ```bash
   dfx start --background
   ```

3. **Run multiple iterations:**
   ```bash
   for i in {1..5}; do ./test_single.sh; done
   ```

4. **Monitor system resources:**
   ```bash
   htop  # Monitor CPU/memory during tests
   ```

5. **Test under different conditions:**
   - Fresh canister vs populated canister
   - Small batches vs large batches
   - Sequential vs time-delayed operations

---

## 📊 What the Dashboard Shows

After running benchmarks, the dashboard displays:

1. **Single Certificate Metrics**
   - Individual operation times
   - Internal vs external performance

2. **Batch Operations Summary**
   - Average time per certificate in batches
   - Throughput comparison

3. **Performance Degradation Graph**
   - Shows how performance changes with batch size
   - Highlights slowdown points
   - Identifies system limits

4. **Success/Failure Analysis**
   - Overall success rate
   - Breakdown by operation type

5. **Throughput Comparison**
   - Issuance vs Verification speed
   - Batch efficiency

---

## 🎯 Interpreting Results

### Good Performance Indicators:
✅ Consistent throughput across batch sizes
✅ >95% success rate
✅ Linear scaling (2x certificates = 2x time)
✅ Low failure rate

### Performance Issues:
⚠️ Exponential time increase with batch size
⚠️ High failure rate (>5%)
⚠️ Throughput drops significantly
⚠️ System becomes unresponsive

---

## 🔧 Troubleshooting

**Issue:** Benchmarks fail immediately
**Solution:** Ensure dfx is running: `dfx start --background`

**Issue:** All operations show 0ms
**Solution:** Operations complete too fast; check end-to-end times instead

**Issue:** High failure rate
**Solution:** Check for duplicate certificate IDs or authorization issues

**Issue:** Slow performance
**Solution:** Local replica may be under load; restart with `dfx start --clean --background`

---

## 📞 Quick Reference

```bash
# Single operation test
./test_single.sh

# Batch issuance (N certificates)
./issue_batch.sh 50

# Batch verification (N certificates)
./verify_batch.sh 50

# System limits (finds breaking point with parallel execution)
./stress_test.sh
# Or with custom concurrency: CONCURRENCY=100 ./stress_test.sh

# View results
open ../metrics_dashboard.html

# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Get current metrics
dfx canister call credential_backend getAllMetricsSummaries '()'
```

---

**Created:** February 4, 2026  
**Status:** ✅ Ready for Use  
**Dashboard:** ../metrics_dashboard.html
