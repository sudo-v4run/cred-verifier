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

**Output:** `benchmark_single_<timestamp>.json`

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

**Output:** `benchmark_issue_<N>_<timestamp>.json`

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

**Output:** `benchmark_verify_<N>_<timestamp>.json`

---

### 4. System Limits Testing (`test_limits.sh`)
Tests increasing batch sizes to find performance degradation points.

**Usage:**
```bash
./test_limits.sh
```

**Tests batch sizes:** 1, 5, 10, 20, 50, 100, 200, 500, 1000

**Measures:**
- Performance at each batch size
- Average time per operation
- Throughput at each scale
- Identifies slowdown points (>2x degradation)
- Maximum supported batch size

**Output:** `benchmark_limits_<timestamp>.json`

**Visualizes:** Performance degradation graph showing when system slows significantly

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
- Typical range: 1000-1500ms per operation
- **What it measures:** Real user experience

### Canister Internal Time
- Pure computation time inside the canister
- Typical range: 0-10μs (sub-microsecond)
- **What it measures:** Code efficiency

### Throughput
- Operations per second
- Typical range: 0.7-0.9 ops/sec
- **What it measures:** System capacity

### Success Rate
- Percentage of successful operations
- Target: >95%
- **What it measures:** System reliability

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

### Example 4: Stress Testing
```bash
# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Run large batch
./issue_batch.sh 500

# Check if system handles load
./verify_batch.sh 500

# Analyze results
```

---

## 📁 Output File Format

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

# System limits (finds breaking point)
./test_limits.sh

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
