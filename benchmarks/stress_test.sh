#!/bin/bash

# System Limits Testing - Find breaking point
# Tests increasing batch sizes to find when system slows significantly

OUTPUT_FILE="benchmark_limits_$(date +%s).json"

echo "================================================"
echo "  SYSTEM LIMITS BENCHMARK"
echo "  Finding Performance Degradation Point"
echo "================================================"
echo ""

# Test batch sizes
BATCH_SIZES=(1 5 10 20 50 100 200 500 1000)
RESULTS_ISSUE=()
RESULTS_VERIFY=()

echo "This will test batch sizes: ${BATCH_SIZES[@]}"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Clear existing metrics
echo "Clearing metrics..."
dfx canister call credential_backend clearMetrics '()' > /dev/null 2>&1
echo ""

# JSON output start
echo "{" > "$OUTPUT_FILE"
echo "  \"test_type\": \"system_limits\"," >> "$OUTPUT_FILE"
echo "  \"date\": \"$(date -Iseconds)\"," >> "$OUTPUT_FILE"
echo "  \"batch_sizes\": [${BATCH_SIZES[@]}]," >> "$OUTPUT_FILE"
echo "  \"issuance_results\": [" >> "$OUTPUT_FILE"

FIRST=true
for SIZE in "${BATCH_SIZES[@]}"; do
  echo "================================================"
  echo "Testing Batch Size: $SIZE certificates"
  echo "================================================"
  
  # Issuance test
  echo "1. Certificate Issuance Test..."
  START_NS=$(date +%s%N)
  
  TIMESTAMP=$(date +%s)
  SUCCESS=0
  FAILED=0
  
  for i in $(seq 1 $SIZE); do
    printf "\r  Issuing: %d/%d" $i $SIZE
    
    RESULT=$(dfx canister call credential_backend issueCertificate "(
      \"LIMIT_${SIZE}_${TIMESTAMP}_$i\",
      \"Limits Test University\",
      \"https://limits.test/verify\",
      \"Student $i\",
      \"LIM${SIZE}$(printf '%06d' $i)\",
      \"principal-limit-$i\",
      \"Bachelor of Science\",
      \"Computer Science\",
      \"2026-06-01\",
      \"2026-06-01\",
      3.5,
      \"Testing\"
    )" 2>&1)
    
    if echo "$RESULT" | grep -q "LIMIT_${SIZE}_${TIMESTAMP}_$i"; then
      SUCCESS=$((SUCCESS + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  done
  
  END_NS=$(date +%s%N)
  DURATION_MS=$(( (END_NS - START_NS) / 1000000 ))
  DURATION_S=$(echo "scale=3; $DURATION_MS / 1000" | bc)
  AVG_MS=$(echo "scale=3; $DURATION_MS / $SIZE" | bc)
  THROUGHPUT=$(echo "scale=3; $SIZE / $DURATION_S" | bc)
  
  echo ""
  echo "  ✓ Time: ${DURATION_S}s | Avg: ${AVG_MS}ms/cert | Throughput: ${THROUGHPUT} certs/s"
  echo "  Success: $SUCCESS | Failed: $FAILED"
  
  # Add to JSON
  if [ "$FIRST" = false ]; then
    echo "    ," >> "$OUTPUT_FILE"
  fi
  FIRST=false
  
  cat >> "$OUTPUT_FILE" << EOF
    {
      "batch_size": $SIZE,
      "total_time_ms": $DURATION_MS,
      "total_time_s": $DURATION_S,
      "avg_time_ms": $AVG_MS,
      "throughput": $THROUGHPUT,
      "successful": $SUCCESS,
      "failed": $FAILED
    }
EOF
  
  # Check for significant slowdown
  if [ "$SIZE" -gt 1 ]; then
    PREV_AVG=${RESULTS_ISSUE[-1]}
    if [ -n "$PREV_AVG" ]; then
      SLOWDOWN=$(echo "scale=2; $AVG_MS / $PREV_AVG" | bc)
      SLOWDOWN_INT=$(echo "$SLOWDOWN" | cut -d. -f1)
      
      if [ "${SLOWDOWN_INT:-0}" -gt 2 ]; then
        echo "  ⚠️  WARNING: Significant slowdown detected (${SLOWDOWN}x slower)"
      fi
    fi
  fi
  
  RESULTS_ISSUE+=($AVG_MS)
  
  echo ""
  sleep 2
done

echo "  ]," >> "$OUTPUT_FILE"
echo "  \"verification_results\": [" >> "$OUTPUT_FILE"

# Verification tests
echo ""
echo "================================================"
echo "Starting Verification Tests..."
echo "================================================"

FIRST=true
for SIZE in "${BATCH_SIZES[@]}"; do
  echo ""
  echo "Testing Verification: $SIZE certificates"
  
  START_NS=$(date +%s%N)
  
  SUCCESS=0
  TIMESTAMP=$(date +%s)
  
  # Verify recently created certificates
  for i in $(seq 1 $SIZE); do
    printf "\r  Verifying: %d/%d" $i $SIZE
    
    RESULT=$(dfx canister call credential_backend verifyCertificate "(\"LIMIT_${SIZE}_${TIMESTAMP}_$i\")" 2>&1)
    
    if echo "$RESULT" | grep -q "true"; then
      SUCCESS=$((SUCCESS + 1))
    fi
  done
  
  END_NS=$(date +%s%N)
  DURATION_MS=$(( (END_NS - START_NS) / 1000000 ))
  DURATION_S=$(echo "scale=3; $DURATION_MS / 1000" | bc)
  AVG_MS=$(echo "scale=3; $DURATION_MS / $SIZE" | bc)
  THROUGHPUT=$(echo "scale=3; $SIZE / $DURATION_S" | bc)
  
  echo ""
  echo "  ✓ Time: ${DURATION_S}s | Avg: ${AVG_MS}ms/verification | Throughput: ${THROUGHPUT} verif/s"
  
  # Add to JSON
  if [ "$FIRST" = false ]; then
    echo "    ," >> "$OUTPUT_FILE"
  fi
  FIRST=false
  
  cat >> "$OUTPUT_FILE" << EOF
    {
      "batch_size": $SIZE,
      "total_time_ms": $DURATION_MS,
      "total_time_s": $DURATION_S,
      "avg_time_ms": $AVG_MS,
      "throughput": $THROUGHPUT,
      "successful": $SUCCESS
    }
EOF
  
  RESULTS_VERIFY+=($AVG_MS)
  
  sleep 2
done

echo "  ]" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo ""
echo "================================================"
echo "  SYSTEM LIMITS TEST COMPLETE"
echo "================================================"
echo ""
echo "Results saved to: $OUTPUT_FILE"
echo ""
echo "Summary:"
echo "  Batch sizes tested: ${BATCH_SIZES[@]}"
echo "  Issuance results: ${RESULTS_ISSUE[@]} ms/cert"
echo "  Verification results: ${RESULTS_VERIFY[@]} ms/verification"
echo ""
echo "Open metrics_dashboard.html to visualize results"
echo "================================================"
