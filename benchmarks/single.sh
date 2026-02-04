#!/bin/bash

# Single Certificate Operations Benchmark
# Tests individual certificate issuance and verification

TIMESTAMP=$(date +%s)
OUTPUT_FILE="benchmark_single.json"

# Remove old single benchmark files (keep only the latest)
rm -f benchmark_single_*.json 2>/dev/null

echo "================================================"
echo "  SINGLE CERTIFICATE BENCHMARK"
echo "================================================"
echo ""

# Register university
echo "Registering university..."
dfx canister call credential_backend registerUniversity '("Single Benchmark University")' > /dev/null 2>&1
echo "✓ University registered"
echo ""

# Test single issuance
echo "1. Testing Single Certificate Issuance..."
CERT_ID="SINGLE_BENCH_${TIMESTAMP}"

START_NS=$(date +%s%N)
RESULT=$(dfx canister call credential_backend issueCertificate "(
  \"$CERT_ID\",
  \"Single Benchmark University\",
  \"https://single.bench/verify\",
  \"Test Student\",
  \"SINGLE001\",
  \"principal-single\",
  \"Bachelor of Science\",
  \"Computer Science\",
  \"2026-06-01\",
  \"2026-06-01\",
  4.0,
  \"Excellent\"
)" 2>&1)
END_NS=$(date +%s%N)

ISSUE_DURATION_NS=$((END_NS - START_NS))
ISSUE_DURATION_MS=$((ISSUE_DURATION_NS / 1000000))
ISSUE_DURATION_US=$((ISSUE_DURATION_NS / 1000))

if echo "$RESULT" | grep -q "$CERT_ID"; then
  ISSUE_SUCCESS=true
  echo "  ✓ Issuance successful"
else
  ISSUE_SUCCESS=false
  echo "  ✗ Issuance failed"
fi
echo "  Time: ${ISSUE_DURATION_MS}ms (${ISSUE_DURATION_US}μs)"
echo ""

# Test single verification
echo "2. Testing Single Certificate Verification..."

START_NS=$(date +%s%N)
VERIFY_RESULT=$(dfx canister call credential_backend verifyCertificate "(\"$CERT_ID\")" 2>&1)
END_NS=$(date +%s%N)

VERIFY_DURATION_NS=$((END_NS - START_NS))
VERIFY_DURATION_MS=$((VERIFY_DURATION_NS / 1000000))
VERIFY_DURATION_US=$((VERIFY_DURATION_NS / 1000))

if echo "$VERIFY_RESULT" | grep -q "true"; then
  VERIFY_SUCCESS=true
  echo "  ✓ Verification successful"
else
  VERIFY_SUCCESS=false
  echo "  ✗ Verification failed"
fi
echo "  Time: ${VERIFY_DURATION_MS}ms (${VERIFY_DURATION_US}μs)"
echo ""

# Get canister internal metrics
echo "3. Fetching Canister Internal Metrics..."
ISSUE_SUMMARY=$(dfx canister call credential_backend getMetricsSummary '("issuance")' 2>/dev/null)
VERIFY_SUMMARY=$(dfx canister call credential_backend getMetricsSummary '("verification")' 2>/dev/null)

CANISTER_ISSUE_AVG=$(echo "$ISSUE_SUMMARY" | grep -oP 'avgDurationUs = \K[\d.]+' | head -1)
CANISTER_VERIFY_AVG=$(echo "$VERIFY_SUMMARY" | grep -oP 'avgDurationUs = \K[\d.]+' | head -1)

echo "  Internal Issuance Time: ${CANISTER_ISSUE_AVG:-0}μs"
echo "  Internal Verification Time: ${CANISTER_VERIFY_AVG:-0}μs"
echo ""

# Export results
cat > "$OUTPUT_FILE" << EOF
{
  "benchmark_type": "single_certificate",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "certificate_id": "$CERT_ID",
  "issuance": {
    "success": $ISSUE_SUCCESS,
    "end_to_end_time_ms": $ISSUE_DURATION_MS,
    "end_to_end_time_us": $ISSUE_DURATION_US,
    "canister_internal_time_us": ${CANISTER_ISSUE_AVG:-0}
  },
  "verification": {
    "success": $VERIFY_SUCCESS,
    "end_to_end_time_ms": $VERIFY_DURATION_MS,
    "end_to_end_time_us": $VERIFY_DURATION_US,
    "canister_internal_time_us": ${CANISTER_VERIFY_AVG:-0}
  },
  "notes": {
    "end_to_end": "Includes network latency + consensus + execution",
    "canister_internal": "Pure computation time (usually <1μs)"
  }
}
EOF

echo "================================================"
echo "  RESULTS SUMMARY"
echo "================================================"
echo "Certificate ID: $CERT_ID"
echo ""
echo "Issuance:"
echo "  Success: $ISSUE_SUCCESS"
echo "  End-to-End: ${ISSUE_DURATION_MS}ms"
echo "  Canister Internal: ${CANISTER_ISSUE_AVG:-0}μs"
echo ""
echo "Verification:"
echo "  Success: $VERIFY_SUCCESS"
echo "  End-to-End: ${VERIFY_DURATION_MS}ms"
echo "  Canister Internal: ${CANISTER_VERIFY_AVG:-0}μs"
echo ""
echo "✓ Results saved to: $OUTPUT_FILE"
echo "================================================"
