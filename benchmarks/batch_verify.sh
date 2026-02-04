#!/bin/bash

# Batch Certificate Verification Benchmark
# Usage: ./verify_batch.sh <number_of_certificates> [prefix]

VERIFY_COUNT=${1:-10}
PREFIX=${2:-"BENCH_ISSUE"}
TIMESTAMP=$(date +%s)
OUTPUT_FILE="benchmark_verify_${VERIFY_COUNT}_${TIMESTAMP}.json"

echo "================================================"
echo "  BATCH CERTIFICATE VERIFICATION BENCHMARK"
echo "================================================"
echo "Count: $VERIFY_COUNT certificates"
echo "Prefix: $PREFIX"
echo ""

# Find available certificates
echo "Checking available certificates..."
CERT_COUNT=$(dfx canister call credential_backend getCertificateCount '()' 2>/dev/null | grep -oP '\d+')
echo "Total certificates in system: ${CERT_COUNT:-0}"
echo ""

if [ "${CERT_COUNT:-0}" -lt "$VERIFY_COUNT" ]; then
  echo "⚠️  Warning: Only $CERT_COUNT certificates available, but $VERIFY_COUNT requested"
  echo "Adjusting verification count to $CERT_COUNT"
  VERIFY_COUNT=$CERT_COUNT
fi

# Measure batch verification
echo "Verifying $VERIFY_COUNT certificates..."
START_NS=$(date +%s%N)

SUCCESS_COUNT=0
FAILED_COUNT=0

for i in $(seq 1 $VERIFY_COUNT); do
  printf "\rProgress: %d/%d (%.1f%%)" $i $VERIFY_COUNT $(echo "scale=1; $i*100/$VERIFY_COUNT" | bc)
  
  # Try to find certificate by pattern
  RESULT=$(dfx canister call credential_backend verifyCertificateWithMetrics "(\"${PREFIX}_${TIMESTAMP}_$i\")" 2>&1)
  
  if echo "$RESULT" | grep -q "true"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

END_NS=$(date +%s%N)
echo ""
echo ""

# Calculate metrics
DURATION_NS=$((END_NS - START_NS))
DURATION_MS=$((DURATION_NS / 1000000))
DURATION_S=$(echo "scale=2; $DURATION_MS / 1000" | bc)
AVG_TIME_MS=$(echo "scale=2; $DURATION_MS / $VERIFY_COUNT" | bc)
THROUGHPUT=$(echo "scale=3; $VERIFY_COUNT / $DURATION_S" | bc)
SUCCESS_RATE=$(echo "scale=1; $SUCCESS_COUNT * 100 / $VERIFY_COUNT" | bc)

# Display results
echo "================================================"
echo "  RESULTS"
echo "================================================"
echo "Total Verifications: $VERIFY_COUNT"
echo "Successful: $SUCCESS_COUNT (${SUCCESS_RATE}%)"
echo "Failed: $FAILED_COUNT"
echo "Total Time: ${DURATION_S}s (${DURATION_MS}ms)"
echo "Average per Verification: ${AVG_TIME_MS}ms"
echo "Throughput: ${THROUGHPUT} verifications/sec"
echo ""

# Get canister metrics
echo "Fetching canister metrics..."
SUMMARY=$(dfx canister call credential_backend getMetricsSummary '("verification")' 2>/dev/null)
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
  "benchmark_type": "batch_verification",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "parameters": {
    "verification_count": $VERIFY_COUNT,
    "prefix": "$PREFIX"
  },
  "end_to_end_metrics": {
    "total_time_ms": $DURATION_MS,
    "total_time_s": $DURATION_S,
    "avg_time_per_verification_ms": $AVG_TIME_MS,
    "throughput_verifications_per_sec": $THROUGHPUT,
    "successful_count": $SUCCESS_COUNT,
    "failed_count": $FAILED_COUNT,
    "success_rate_percent": $SUCCESS_RATE
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
