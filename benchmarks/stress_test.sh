#!/bin/bash

# System Limits Testing - Find breaking point
# Tests increasing batch sizes to find when system slows significantly
# Uses PARALLEL issuance to simulate concurrent users and test scalability

OUTPUT_FILE="benchmark_concurrency.json"

# Remove old concurrency/stress test benchmark files
rm -f benchmark_limits_*.json benchmark_concurrency_*.json 2>/dev/null

# Concurrency level: how many certificates to issue in parallel
# Default: 50 parallel requests
# To customize: CONCURRENCY=100 ./stress_test.sh
# Example: CONCURRENCY=200 ./stress_test.sh  (for 200 concurrent requests)
MAX_CONCURRENCY=${CONCURRENCY:- 10}

echo "================================================"
echo "  SYSTEM LIMITS BENCHMARK (PARALLEL)"
echo "  Finding Performance Degradation Point"
echo "  Simulating Concurrent User Load"
echo "================================================"
echo ""
echo "Concurrency level: $MAX_CONCURRENCY parallel requests"
echo ""

# Test batch sizes
BATCH_SIZES=(1 10 50 100 500 1000)
RESULTS_ISSUE=()
RESULTS_VERIFY=()

echo "This will test batch sizes: ${BATCH_SIZES[@]}"
echo "Each batch will be issued in PARALLEL (simulating concurrent users)"
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

# Function to issue a single certificate (for parallel execution)
issue_certificate() {
  local cert_id=$1
  local timestamp=$2
  local batch_size=$3
  local index=$4
  local result_file=$5
  
  RESULT=$(dfx canister call credential_backend issueCertificate "(
    \"LIMIT_${batch_size}_${timestamp}_${index}\",
    \"Limits Test University\",
    \"https://limits.test/verify\",
    \"Student ${index}\",
    \"LIM${batch_size}$(printf '%06d' ${index})\",
    \"principal-limit-${index}\",
    \"Bachelor of Science\",
    \"Computer Science\",
    \"2026-06-01\",
    \"2026-06-01\",
    3.5,
    \"Testing\"
  )" 2>&1)
  
  if echo "$RESULT" | grep -q "LIMIT_${batch_size}_${timestamp}_${index}"; then
    echo "SUCCESS" > "$result_file"
  else
    echo "FAILED" > "$result_file"
  fi
}

FIRST=true
for SIZE in "${BATCH_SIZES[@]}"; do
  echo "================================================"
  echo "Testing Batch Size: $SIZE certificates (PARALLEL)"
  echo "================================================"
  
  # Issuance test - PARALLEL execution
  echo "1. Certificate Issuance Test (Concurrent)..."
  START_NS=$(date +%s%N)
  
  TIMESTAMP=$(date +%s)
  SUCCESS=0
  FAILED=0
  
  # Determine concurrency: use min of batch size and max_concurrency
  CONCURRENT=$(( SIZE < MAX_CONCURRENCY ? SIZE : MAX_CONCURRENCY ))
  
  # Create temp directory for result files
  TEMP_DIR=$(mktemp -d)
  trap "rm -rf $TEMP_DIR" EXIT
  
  # Issue certificates in parallel batches
  PIDS=()
  CURRENT_INDEX=1
  
  while [ $CURRENT_INDEX -le $SIZE ]; do
    # Start jobs up to concurrency limit
    while [ ${#PIDS[@]} -lt $CONCURRENT ] && [ $CURRENT_INDEX -le $SIZE ]; do
      RESULT_FILE="$TEMP_DIR/result_${CURRENT_INDEX}"
      issue_certificate "cert_${CURRENT_INDEX}" "$TIMESTAMP" "$SIZE" "$CURRENT_INDEX" "$RESULT_FILE" &
      PIDS+=($!)
      CURRENT_INDEX=$((CURRENT_INDEX + 1))
      
      # Show progress
      if [ $((CURRENT_INDEX % 10)) -eq 0 ] || [ $CURRENT_INDEX -gt $SIZE ]; then
        printf "\r  Issuing: %d/%d (active: %d)" $((CURRENT_INDEX - 1)) $SIZE ${#PIDS[@]}
      fi
    done
    
    # Wait for at least one job to complete
    if [ ${#PIDS[@]} -ge $CONCURRENT ] || [ $CURRENT_INDEX -gt $SIZE ]; then
      # Wait for any job to finish
      for pid in "${PIDS[@]}"; do
        if ! kill -0 "$pid" 2>/dev/null; then
          # Process finished, remove from array
          NEW_PIDS=()
          for p in "${PIDS[@]}"; do
            [ "$p" != "$pid" ] && NEW_PIDS+=($p)
          done
          PIDS=("${NEW_PIDS[@]}")
          break
        fi
      done
      # If no job finished, wait a bit
      if [ ${#PIDS[@]} -ge $CONCURRENT ]; then
        sleep 0.1
      fi
    fi
  done
  
  # Wait for all remaining jobs
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null
  done
  
  # Count successes and failures
  for i in $(seq 1 $SIZE); do
    RESULT_FILE="$TEMP_DIR/result_${i}"
    if [ -f "$RESULT_FILE" ]; then
      if grep -q "SUCCESS" "$RESULT_FILE"; then
        SUCCESS=$((SUCCESS + 1))
      else
        FAILED=$((FAILED + 1))
      fi
    else
      FAILED=$((FAILED + 1))
    fi
  done
  
  # Cleanup
  rm -rf "$TEMP_DIR"
  trap - EXIT
  
  END_NS=$(date +%s%N)
  DURATION_MS=$(( (END_NS - START_NS) / 1000000 ))
  DURATION_S=$(echo "scale=3; $DURATION_MS / 1000" | bc)
  AVG_MS=$(echo "scale=3; $DURATION_MS / $SIZE" | bc)
  THROUGHPUT=$(echo "scale=3; $SIZE / $DURATION_S" | bc)
  
  echo ""
  echo "  ✓ Time: ${DURATION_S}s | Avg: ${AVG_MS}ms/cert | Throughput: ${THROUGHPUT} certs/s"
  echo "  Success: $SUCCESS | Failed: $FAILED | Concurrent: $CONCURRENT"
  
  # Add to JSON
  if [ "$FIRST" = false ]; then
    echo "    ," >> "$OUTPUT_FILE"
  fi
  FIRST=false
  
  cat >> "$OUTPUT_FILE" << EOF
    {
      "batch_size": $SIZE,
      "concurrency": $CONCURRENT,
      "parallel": true,
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

# Function to verify a single certificate (for parallel execution)
verify_certificate() {
  local batch_size=$1
  local timestamp=$2
  local index=$3
  local result_file=$4
  
  RESULT=$(dfx canister call credential_backend verifyCertificate "(\"LIMIT_${batch_size}_${timestamp}_${index}\")" 2>&1)
  
  if echo "$RESULT" | grep -q "true"; then
    echo "SUCCESS" > "$result_file"
  else
    echo "FAILED" > "$result_file"
  fi
}

FIRST=true
for SIZE in "${BATCH_SIZES[@]}"; do
  echo ""
  echo "Testing Verification: $SIZE certificates (PARALLEL)"
  
  START_NS=$(date +%s%N)
  
  SUCCESS=0
  TIMESTAMP=$(date +%s)
  
  # Determine concurrency for verification
  CONCURRENT=$(( SIZE < MAX_CONCURRENCY ? SIZE : MAX_CONCURRENCY ))
  
  # Create temp directory for result files
  TEMP_DIR=$(mktemp -d)
  trap "rm -rf $TEMP_DIR" EXIT
  
  # Verify certificates in parallel batches
  PIDS=()
  CURRENT_INDEX=1
  
  while [ $CURRENT_INDEX -le $SIZE ]; do
    # Start jobs up to concurrency limit
    while [ ${#PIDS[@]} -lt $CONCURRENT ] && [ $CURRENT_INDEX -le $SIZE ]; do
      RESULT_FILE="$TEMP_DIR/verify_${CURRENT_INDEX}"
      verify_certificate "$SIZE" "$TIMESTAMP" "$CURRENT_INDEX" "$RESULT_FILE" &
      PIDS+=($!)
      CURRENT_INDEX=$((CURRENT_INDEX + 1))
      
      # Show progress
      if [ $((CURRENT_INDEX % 10)) -eq 0 ] || [ $CURRENT_INDEX -gt $SIZE ]; then
        printf "\r  Verifying: %d/%d (active: %d)" $((CURRENT_INDEX - 1)) $SIZE ${#PIDS[@]}
      fi
    done
    
    # Wait for at least one job to complete
    if [ ${#PIDS[@]} -ge $CONCURRENT ] || [ $CURRENT_INDEX -gt $SIZE ]; then
      # Wait for any job to finish
      for pid in "${PIDS[@]}"; do
        if ! kill -0 "$pid" 2>/dev/null; then
          # Process finished, remove from array
          NEW_PIDS=()
          for p in "${PIDS[@]}"; do
            [ "$p" != "$pid" ] && NEW_PIDS+=($p)
          done
          PIDS=("${NEW_PIDS[@]}")
          break
        fi
      done
      # If no job finished, wait a bit
      if [ ${#PIDS[@]} -ge $CONCURRENT ]; then
        sleep 0.1
      fi
    fi
  done
  
  # Wait for all remaining jobs
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null
  done
  
  # Count successes
  for i in $(seq 1 $SIZE); do
    RESULT_FILE="$TEMP_DIR/verify_${i}"
    if [ -f "$RESULT_FILE" ] && grep -q "SUCCESS" "$RESULT_FILE"; then
      SUCCESS=$((SUCCESS + 1))
    fi
  done
  
  # Cleanup
  rm -rf "$TEMP_DIR"
  trap - EXIT
  
  END_NS=$(date +%s%N)
  DURATION_MS=$(( (END_NS - START_NS) / 1000000 ))
  DURATION_S=$(echo "scale=3; $DURATION_MS / 1000" | bc)
  AVG_MS=$(echo "scale=3; $DURATION_MS / $SIZE" | bc)
  THROUGHPUT=$(echo "scale=3; $SIZE / $DURATION_S" | bc)
  
  echo ""
  echo "  ✓ Time: ${DURATION_S}s | Avg: ${AVG_MS}ms/verification | Throughput: ${THROUGHPUT} verif/s | Concurrent: $CONCURRENT"
  
  # Add to JSON
  if [ "$FIRST" = false ]; then
    echo "    ," >> "$OUTPUT_FILE"
  fi
  FIRST=false
  
  cat >> "$OUTPUT_FILE" << EOF
    {
      "batch_size": $SIZE,
      "concurrency": $CONCURRENT,
      "parallel": true,
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
echo "  SYSTEM LIMITS TEST COMPLETE (PARALLEL)"
echo "================================================"
echo ""
echo "Results saved to: $OUTPUT_FILE"
echo ""
echo "Summary:"
echo "  Batch sizes tested: ${BATCH_SIZES[@]}"
echo "  Max concurrency: $MAX_CONCURRENCY parallel requests"
echo "  Issuance results: ${RESULTS_ISSUE[@]} ms/cert"
echo "  Verification results: ${RESULTS_VERIFY[@]} ms/verification"
echo ""
echo "Note: This test uses PARALLEL execution to simulate concurrent users"
echo "      and test system scalability under load."
echo ""
echo "To adjust concurrency level:"
echo "  CONCURRENCY=10 ./stress_test.sh   # Light load (10 concurrent)"
echo "  CONCURRENCY=100 ./stress_test.sh  # Medium load (100 concurrent)"
echo "  CONCURRENCY=200 ./stress_test.sh  # Heavy load (200 concurrent)"
echo ""
echo "Open metrics_dashboard.html to visualize results"
echo "================================================"
