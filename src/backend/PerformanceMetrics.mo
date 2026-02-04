// PerformanceMetrics.mo - Performance tracking and benchmarking

import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Float "mo:base/Float";

module {
  // Metric types
  public type OperationType = {
    #issuance;
    #verification;
    #revocation;
    #merkleTreeBuild;
    #merkleProofGeneration;
  };

  public type MetricEntry = {
    operation: OperationType;
    startTime: Int;
    endTime: Int;
    duration: Int; // nanoseconds
    certificateCount: Nat; // Total certificates at time of operation
    success: Bool;
    additionalInfo: Text;
  };

  public type MetricsSummary = {
    operationType: Text;
    totalOperations: Nat;
    successfulOperations: Nat;
    failedOperations: Nat;
    avgDurationUs: Float; // Changed to microseconds for better precision
    minDurationUs: Float;
    maxDurationUs: Float;
    totalDurationUs: Float;
  };

  public type LoadTestResult = {
    operationCount: Nat;
    totalTimeUs: Float; // Changed to microseconds
    avgTimePerOpUs: Float;
    opsPerSecond: Float;
    certificateCount: Nat;
  };

  public type PerformanceSnapshot = {
    timestamp: Int;
    totalOperations: Nat;
    totalCertificates: Nat;
    avgIssuanceTimeUs: Float; // Changed to microseconds
    avgVerificationTimeUs: Float;
  };

  // Convert nanoseconds to microseconds
  public func nsToUs(ns: Int) : Float {
    Float.fromInt(ns) / 1_000.0;
  };

  // Convert operation type to text
  public func operationTypeToText(op: OperationType) : Text {
    switch (op) {
      case (#issuance) { "Certificate Issuance" };
      case (#verification) { "Certificate Verification" };
      case (#revocation) { "Certificate Revocation" };
      case (#merkleTreeBuild) { "Merkle Tree Construction" };
      case (#merkleProofGeneration) { "Merkle Proof Generation" };
    };
  };

  // Calculate metrics summary for a specific operation type
  public func calculateSummary(metrics: [MetricEntry], opType: OperationType) : MetricsSummary {
    let filtered = Array.filter<MetricEntry>(
      metrics,
      func(m) { operationTypesEqual(m.operation, opType) }
    );

    if (filtered.size() == 0) {
      return {
        operationType = operationTypeToText(opType);
        totalOperations = 0;
        successfulOperations = 0;
        failedOperations = 0;
        avgDurationUs = 0.0;
        minDurationUs = 0.0;
        maxDurationUs = 0.0;
        totalDurationUs = 0.0;
      };
    };

    var totalDuration: Int = 0;
    var minDuration: Int = filtered[0].duration;
    var maxDuration: Int = filtered[0].duration;
    var successCount: Nat = 0;

    for (entry in filtered.vals()) {
      totalDuration += entry.duration;
      if (entry.duration < minDuration) { minDuration := entry.duration };
      if (entry.duration > maxDuration) { maxDuration := entry.duration };
      if (entry.success) { successCount += 1 };
    };

    let totalUs = nsToUs(totalDuration);
    let avgUs = totalUs / Float.fromInt(filtered.size());

    {
      operationType = operationTypeToText(opType);
      totalOperations = filtered.size();
      successfulOperations = successCount;
      failedOperations = filtered.size() - successCount;
      avgDurationUs = avgUs;
      minDurationUs = nsToUs(minDuration);
      maxDurationUs = nsToUs(maxDuration);
      totalDurationUs = totalUs;
    };
  };

  // Helper to compare operation types
  private func operationTypesEqual(op1: OperationType, op2: OperationType) : Bool {
    switch (op1, op2) {
      case (#issuance, #issuance) { true };
      case (#verification, #verification) { true };
      case (#revocation, #revocation) { true };
      case (#merkleTreeBuild, #merkleTreeBuild) { true };
      case (#merkleProofGeneration, #merkleProofGeneration) { true };
      case (_, _) { false };
    };
  };

  // Calculate throughput metrics
  public func calculateLoadMetrics(
    metrics: [MetricEntry],
    opType: OperationType
  ) : LoadTestResult {
    let filtered = Array.filter<MetricEntry>(
      metrics,
      func(m) { operationTypesEqual(m.operation, opType) }
    );

    if (filtered.size() == 0) {
      return {
        operationCount = 0;
        totalTimeUs = 0.0;
        avgTimePerOpUs = 0.0;
        opsPerSecond = 0.0;
        certificateCount = 0;
      };
    };

    var totalDuration: Int = 0;
    var maxCertCount: Nat = 0;

    for (entry in filtered.vals()) {
      totalDuration += entry.duration;
      if (entry.certificateCount > maxCertCount) {
        maxCertCount := entry.certificateCount;
      };
    };

    let totalUs = nsToUs(totalDuration);
    let avgUs = totalUs / Float.fromInt(filtered.size());
    let totalSeconds = totalUs / 1_000_000.0;
    let opsPerSec = if (totalSeconds > 0.0) {
      Float.fromInt(filtered.size()) / totalSeconds;
    } else { 0.0 };

    {
      operationCount = filtered.size();
      totalTimeUs = totalUs;
      avgTimePerOpUs = avgUs;
      opsPerSecond = opsPerSec;
      certificateCount = maxCertCount;
    };
  };

  // Get recent performance snapshot
  public func getSnapshot(
    metrics: [MetricEntry],
    totalCerts: Nat
  ) : PerformanceSnapshot {
    let issuanceSummary = calculateSummary(metrics, #issuance);
    let verificationSummary = calculateSummary(metrics, #verification);

    {
      timestamp = Time.now();
      totalCertificates = totalCerts;
      totalOperations = metrics.size();
      avgIssuanceTimeUs = issuanceSummary.avgDurationUs;
      avgVerificationTimeUs = verificationSummary.avgDurationUs;
    };
  };

  // Filter metrics by time range
  public func filterByTimeRange(
    metrics: [MetricEntry],
    startTime: Int,
    endTime: Int
  ) : [MetricEntry] {
    Array.filter<MetricEntry>(
      metrics,
      func(m) { m.startTime >= startTime and m.startTime <= endTime }
    );
  };

  // Get metrics for last N operations
  public func getRecentMetrics(metrics: [MetricEntry], count: Nat) : [MetricEntry] {
    let size = metrics.size();
    if (size <= count) {
      return metrics;
    };
    
    let startIdx = size - count;
    Array.tabulate<MetricEntry>(
      count,
      func(i) { metrics[startIdx + i] }
    );
  };

  // Calculate percentiles (P50, P95, P99)
  public func calculatePercentile(durations: [Int], percentile: Float) : Float {
    if (durations.size() == 0) { return 0.0 };
    
    let sorted = Array.sort<Int>(durations, Int.compare);
    let indexFloat = Float.fromInt(sorted.size()) * percentile / 100.0;
    var index = Float.toInt(indexFloat);
    
    if (index >= sorted.size()) { 
      index := sorted.size() - 1;
    };
    if (index < 0) {
      index := 0;
    };
    
    nsToUs(sorted[Int.abs(index)]);
  };
};
