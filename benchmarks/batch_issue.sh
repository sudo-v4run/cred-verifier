#!/bin/bash

# Batch Certificate Issuance Benchmark
# Usage: ./issue_batch.sh <number_of_certificates> [university_name]

CERT_COUNT=${1:-10}
UNIVERSITY=${2:-"Benchmark University"}
TIMESTAMP=$(date +%s)
OUTPUT_FILE="benchmark_issue_${CERT_COUNT}_${TIMESTAMP}.json"

# Note: This script generates timestamped files for batch testing
# Main benchmark files are: benchmark_single.json and benchmark_concurrency.json

echo "================================================"
echo "  BATCH CERTIFICATE ISSUANCE BENCHMARK"
echo "================================================"
echo "Count: $CERT_COUNT certificates"
echo "University: $UNIVERSITY"
echo ""

# Register university
echo "Registering university..."
dfx canister call credential_backend registerUniversity "(\"$UNIVERSITY\")" > /dev/null 2>&1
echo "✓ University registered"
echo ""

# Measure batch issuance
echo "Issuing $CERT_COUNT certificates..."
START_NS=$(date +%s%N)

for i in $(seq 1 $CERT_COUNT); do
  printf "\rProgress: %d/%d (%.1f%%)" $i $CERT_COUNT $(echo "scale=1; $i*100/$CERT_COUNT" | bc)
  
  dfx canister call credential_backend issueCertificate "(
    \"BENCH_ISSUE_${TIMESTAMP}_$i\",
    \"$UNIVERSITY\",
    \"https://benchmark.edu/verify\",
    \"Student $i\",
    \"BENCH$(printf '%06d' $i)\",
    \"principal-bench-$i\",
    \"Bachelor of Science\",
    \"Computer Science\",
    \"2026-06-01\",
    \"2026-06-01\",
    3.5,
    \"Good Standing\"
  )" > /dev/null 2>&1
  
  RESULT=$?
  if [ $RESULT -ne 0 ]; then
    echo ""
    echo "⚠️  Warning: Certificate $i failed to issue"
  fi
done

END_NS=$(date +%s%N)
echo ""
echo ""

# Calculate metrics
DURATION_NS=$((END_NS - START_NS))
DURATION_MS=$((DURATION_NS / 1000000))
DURATION_S=$(echo "scale=2; $DURATION_MS / 1000" | bc)
AVG_TIME_MS=$(echo "scale=2; $DURATION_MS / $CERT_COUNT" | bc)
THROUGHPUT=$(echo "scale=3; $CERT_COUNT / $DURATION_S" | bc)

# Display results
echo "================================================"
echo "  RESULTS"
echo "================================================"
echo "Total Certificates: $CERT_COUNT"
echo "Total Time: ${DURATION_S}s (${DURATION_MS}ms)"
echo "Average per Certificate: ${AVG_TIME_MS}ms"
echo "Throughput: ${THROUGHPUT} certs/sec"
echo ""

# Get canister metrics
echo "Fetching canister metrics..."
SUMMARY=$(dfx canister call credential_backend getMetricsSummary '("issuance")' 2>/dev/null)
CANISTER_TOTAL=$(echo "$SUMMARY" | grep -oP 'totalOperations = \K\d+' | head -1)
CANISTER_SUCCESS=$(echo "$SUMMARY" | grep -oP 'successfulOperations = \K\d+' | head -1)
CANISTER_FAILED=$(echo "$SUMMARY" | grep -oP 'failedOperations = \K\d+' | head -1)
CANISTER_AVG=$(echo "$SUMMARY" | grep -oP 'avgDurationUs = \K[\d.]+' | head -1)

echo "Canister Metrics:"
echo "  Total Operations: ${CANISTER_TOTAL:-0}"
echo "  Successful: ${CANISTER_SUCCESS:-0}"
echo "  Failed: ${CANISTER_FAILED:-0}"
echo "  Avg Duration: ${CANISTER_AVG:-0}μs"
echo ""

# Export to JSON
cat > "$OUTPUT_FILE" << EOF
{
  "benchmark_type": "batch_issuance",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "parameters": {
    "certificate_count": $CERT_COUNT,
    "university": "$UNIVERSITY"
  },
  "end_to_end_metrics": {
    "total_time_ms": $DURATION_MS,
    "total_time_s": $DURATION_S,
    "avg_time_per_cert_ms": $AVG_TIME_MS,
    "throughput_certs_per_sec": $THROUGHPUT
  },
  "canister_metrics": {
    "total_operations": ${CANISTER_TOTAL:-0},
    "successful_operations": ${CANISTER_SUCCESS:-0},
    "failed_operations": ${CANISTER_FAILED:-0},
    "avg_duration_us": ${CANISTER_AVG:-0}
  }
}
EOF

echo "✓ Results saved to: $OUTPUT_FILE"
echo "================================================"
