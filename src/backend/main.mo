// main.mo - Main actor with public API
// Modular implementation of Academic Credential Verification System

import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Option "mo:base/Option";
import CertifiedData "mo:base/CertifiedData";
import Blob "mo:base/Blob";

// Import custom modules
import Types "./Types";
import Utils "./Utils";
import MerkleTree "./MerkleTree";
import CertManager "./CertificateManager";
import PerfMetrics "./PerformanceMetrics";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";

persistent actor class AcademicCredentialSystem() {
  
  // Type imports
  type Certificate = Types.Certificate;
  type VerificationResult = Types.VerificationResult;
  type MerkleNode = Types.MerkleNode;
  type CertificateId = Types.CertificateId;
  type MetricEntry = PerfMetrics.MetricEntry;
  type MetricsSummary = PerfMetrics.MetricsSummary;
  type LoadTestResult = PerfMetrics.LoadTestResult;
  type PerformanceSnapshot = PerfMetrics.PerformanceSnapshot;

  // Stable storage for persistence
  private var certificateEntries : [(CertificateId, Certificate)] = [];
  private var universityEntries : [(Principal, Text)] = [];
  private var merkleRootStable : Text = "";
  private var metricsEntries : [MetricEntry] = [];
  
  // State variables
  private transient var certificates = HashMap.HashMap<CertificateId, Certificate>(10, Text.equal, Text.hash);
  private transient var universities = HashMap.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);
  private transient var certifiedDataHash : Blob = Blob.fromArray([]);
  private transient var merkleRoot : Text = "";
  private transient var merkleNodes = HashMap.HashMap<Text, MerkleNode>(10, Text.equal, Text.hash);
  private transient var performanceMetrics = Buffer.Buffer<MetricEntry>(100);

  // ============================================
  // SYSTEM UPGRADE HOOKS
  // ============================================
  
  system func preupgrade() {
    certificateEntries := Iter.toArray(certificates.entries());
    universityEntries := Iter.toArray(universities.entries());
    merkleRootStable := merkleRoot;
    metricsEntries := Buffer.toArray(performanceMetrics);
  };

  system func postupgrade() {
    certificates := HashMap.fromIter<CertificateId, Certificate>(
      certificateEntries.vals(), 10, Text.equal, Text.hash
    );
    universities := HashMap.fromIter<Principal, Text>(
      universityEntries.vals(), 10, Principal.equal, Principal.hash
    );
    merkleRoot := merkleRootStable;
    certificateEntries := [];
    universityEntries := [];
    
    // Restore performance metrics
    performanceMetrics := Buffer.Buffer<MetricEntry>(100);
    for (entry in metricsEntries.vals()) {
      performanceMetrics.add(entry);
    };
    metricsEntries := [];
    
    updateCertifiedData();
  };

  // ============================================
  // PRIVATE HELPER FUNCTIONS
  // ============================================
  
  // Update certified data with Merkle root
  private func updateCertifiedData() {
    // Build Merkle tree and get root
    let root = MerkleTree.buildMerkleTree(certificates, merkleNodes);
    merkleRoot := root;
    
    // Convert root hash to blob (take first 32 bytes)
    let certBlob = Utils.textTo32ByteBlob(root);
    CertifiedData.set(certBlob);
    certifiedDataHash := certBlob;
  };

  // Check if caller is a registered university
  private func isUniversity(principal: Principal) : Bool {
    Option.isSome(universities.get(principal));
  };

  // Record performance metric
  private func recordMetric(
    operation: PerfMetrics.OperationType,
    startTime: Int,
    endTime: Int,
    success: Bool,
    info: Text
  ) {
    let metric: MetricEntry = {
      operation = operation;
      startTime = startTime;
      endTime = endTime;
      duration = endTime - startTime;
      certificateCount = certificates.size();
      success = success;
      additionalInfo = info;
    };
    performanceMetrics.add(metric);
    
    // Keep only last 1000 metrics to prevent unbounded growth
    if (performanceMetrics.size() > 1000) {
      let recent = Buffer.Buffer<MetricEntry>(1000);
      var i = performanceMetrics.size() - 1000;
      while (i < performanceMetrics.size()) {
        recent.add(performanceMetrics.get(i));
        i += 1;
      };
      performanceMetrics := recent;
    };
  };

  // ============================================
  // UNIVERSITY MANAGEMENT API
  // ============================================
  
  // Register a university (admin function)
  public shared(msg) func registerUniversity(name: Text) : async Bool {
    universities.put(msg.caller, name);
    true;
  };

  // Check if caller is a registered university
  public query func isRegisteredUniversity(principal: Principal) : async Bool {
    isUniversity(principal);
  };

  // Get university name by principal
  public query func getUniversityName(principal: Principal) : async ?Text {
    universities.get(principal);
  };

  // Get all registered universities
  public query func getAllUniversities() : async [(Principal, Text)] {
    Iter.toArray(universities.entries());
  };

  // ============================================
  // CERTIFICATE MANAGEMENT API
  // ============================================
  
  // Issue a new certificate (only universities can call this)
  public shared(msg) func issueCertificate(
    certificateId: Text,
    universityName: Text,
    verificationUrl: Text,
    recipientName: Text,
    studentId: Text,
    recipientPrincipal: Text,
    degreeType: Text,
    major: Text,
    graduationDate: Text,
    issueDate: Text,
    gpa: Float,
    honors: Text
  ) : async Text {
    let startTime = Time.now();
    var success = false;
    var resultId = "";
    
    // Verify caller is a registered university
    if (not isUniversity(msg.caller)) {
      recordMetric(#issuance, startTime, Time.now(), false, "Unauthorized caller");
      return "Error: Only registered universities can issue certificates";
    };

    // Check if certificate already exists
    switch (certificates.get(certificateId)) {
      case (?_) { 
        recordMetric(#issuance, startTime, Time.now(), false, "Duplicate certificate ID");
        return "Error: Certificate ID already exists"; 
      };
      case null {};
    };
    
    // Create certificate using CertificateManager
    let finalCertificate = CertManager.createCertificate(
      certificateId,
      universityName,
      verificationUrl,
      recipientName,
      studentId,
      recipientPrincipal,
      degreeType,
      major,
      graduationDate,
      issueDate,
      gpa,
      honors,
      msg.caller
    );

    certificates.put(certificateId, finalCertificate);
    
    let merkleStartTime = Time.now();
    updateCertifiedData();
    let merkleEndTime = Time.now();
    
    // Record Merkle tree build time separately
    recordMetric(#merkleTreeBuild, merkleStartTime, merkleEndTime, true, "Tree rebuilt after issuance");
    
    success := true;
    resultId := certificateId;
    
    let endTime = Time.now();
    recordMetric(#issuance, startTime, endTime, success, certificateId);
    
    resultId;
  };

  // Get certificate by ID (query call for efficiency)
  public query func getCertificate(certificateId: Text) : async ?Certificate {
    certificates.get(certificateId);
  };

  // Verify certificate with certified data - CERTIFIED QUERY for trustless verification
  public query func verifyCertificate(certificateId: Text) : async VerificationResult {
    // Note: Cannot record metrics in query calls
    
    let result = switch (certificates.get(certificateId)) {
      case null {
        {
          is_valid = false;
          certificate = null;
          verified_hash = "";
          merkle_proof = [];
          merkle_root = merkleRoot;
          message = "Certificate not found";
        };
      };
      case (?cert) {
        let proof = MerkleTree.getMerkleProof(cert.certificate_hash, certificates);
        CertManager.verifyCertificate(cert, proof, merkleRoot);
      };
    };
    
    result;
  };

  // Verify certificate with metrics tracking (non-query update call)
  public shared func verifyCertificateWithMetrics(certificateId: Text) : async VerificationResult {
    let startTime = Time.now();
    var success = false;
    
    let result = switch (certificates.get(certificateId)) {
      case null {
        {
          is_valid = false;
          certificate = null;
          verified_hash = "";
          merkle_proof = [];
          merkle_root = merkleRoot;
          message = "Certificate not found";
        };
      };
      case (?cert) {
        let proofStartTime = Time.now();
        let proof = MerkleTree.getMerkleProof(cert.certificate_hash, certificates);
        let proofEndTime = Time.now();
        
        recordMetric(#merkleProofGeneration, proofStartTime, proofEndTime, true, certificateId);
        success := cert.is_revoked == false;
        CertManager.verifyCertificate(cert, proof, merkleRoot);
      };
    };
    
    let endTime = Time.now();
    recordMetric(#verification, startTime, endTime, success, certificateId);
    
    result;
  };

  // Revoke a certificate (only issuing university can revoke)
  public shared(msg) func revokeCertificate(certificateId: Text) : async Bool {
    let startTime = Time.now();
    var success = false;
    
    if (not isUniversity(msg.caller)) {
      recordMetric(#revocation, startTime, Time.now(), false, "Unauthorized");
      return false;
    };

    let result = switch (certificates.get(certificateId)) {
      case null { false };
      case (?cert) {
        let updatedCert = CertManager.revokeCertificate(cert);
        certificates.put(certificateId, updatedCert);
        updateCertifiedData();
        success := true;
        true;
      };
    };
    
    let endTime = Time.now();
    recordMetric(#revocation, startTime, endTime, success, certificateId);
    
    result;
  };

  // Get all certificates for a student
  public query func getCertificatesByStudent(studentId: Text) : async [Certificate] {
    let results = Array.filter<Certificate>(
      Iter.toArray(certificates.vals()),
      func (cert: Certificate) : Bool {
        cert.recipient.student_id == studentId
      }
    );
    results;
  };

  // Get all certificates issued by a university
  public query func getCertificatesByUniversity(universityName: Text) : async [Certificate] {
    let results = Array.filter<Certificate>(
      Iter.toArray(certificates.vals()),
      func (cert: Certificate) : Bool {
        cert.issuer.name == universityName
      }
    );
    results;
  };

  // Get total number of certificates
  public query func getTotalCertificates() : async Nat {
    certificates.size();
  };

  // ============================================
  // MERKLE TREE & CERTIFIED DATA API
  // ============================================
  
  // Get certified data for browser verification
  public query func getCertifiedData() : async Blob {
    certifiedDataHash;
  };

  // Get current Merkle root
  public query func getMerkleRoot() : async Text {
    merkleRoot;
  };

  // Verify Merkle proof for a given hash
  public query func verifyMerkleProof(leafHash: Text, proof: [Text]) : async Bool {
    MerkleTree.verifyProof(leafHash, proof, merkleRoot);
  };

  // ============================================
  // PERFORMANCE METRICS API
  // ============================================
  
  // Get all performance metrics
  public query func getAllMetrics() : async [MetricEntry] {
    Buffer.toArray(performanceMetrics);
  };

  // Get metrics summary for a specific operation type
  public query func getMetricsSummary(operationType: Text) : async ?MetricsSummary {
    let opType = switch (operationType) {
      case "issuance" { ?#issuance };
      case "verification" { ?#verification };
      case "revocation" { ?#revocation };
      case "merkleTreeBuild" { ?#merkleTreeBuild };
      case "merkleProofGeneration" { ?#merkleProofGeneration };
      case _ { null };
    };

    switch (opType) {
      case null { null };
      case (?op) {
        let metrics = Buffer.toArray(performanceMetrics);
        ?PerfMetrics.calculateSummary(metrics, op);
      };
    };
  };

  // Get all summaries for all operation types
  public query func getAllMetricsSummaries() : async [MetricsSummary] {
    let metrics = Buffer.toArray(performanceMetrics);
    [
      PerfMetrics.calculateSummary(metrics, #issuance),
      PerfMetrics.calculateSummary(metrics, #verification),
      PerfMetrics.calculateSummary(metrics, #revocation),
      PerfMetrics.calculateSummary(metrics, #merkleTreeBuild),
      PerfMetrics.calculateSummary(metrics, #merkleProofGeneration),
    ];
  };

  // Get load test results for a specific operation
  public query func getLoadMetrics(operationType: Text) : async ?LoadTestResult {
    let opType = switch (operationType) {
      case "issuance" { ?#issuance };
      case "verification" { ?#verification };
      case "revocation" { ?#revocation };
      case "merkleTreeBuild" { ?#merkleTreeBuild };
      case "merkleProofGeneration" { ?#merkleProofGeneration };
      case _ { null };
    };

    switch (opType) {
      case null { null };
      case (?op) {
        let metrics = Buffer.toArray(performanceMetrics);
        ?PerfMetrics.calculateLoadMetrics(metrics, op);
      };
    };
  };

  // Get performance snapshot
  public query func getPerformanceSnapshot() : async PerformanceSnapshot {
    let metrics = Buffer.toArray(performanceMetrics);
    PerfMetrics.getSnapshot(metrics, certificates.size());
  };

  // Get recent metrics (last N entries)
  public query func getRecentMetrics(count: Nat) : async [MetricEntry] {
    let metrics = Buffer.toArray(performanceMetrics);
    PerfMetrics.getRecentMetrics(metrics, count);
  };

  // Clear all performance metrics (admin function)
  public shared(msg) func clearMetrics() : async Bool {
    if (not isUniversity(msg.caller)) {
      return false;
    };
    performanceMetrics := Buffer.Buffer<MetricEntry>(100);
    true;
  };

  // Get total number of recorded metrics
  public query func getMetricsCount() : async Nat {
    performanceMetrics.size();
  };
};
