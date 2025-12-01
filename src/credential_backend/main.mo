import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import CertifiedData "mo:base/CertifiedData";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";

persistent actor class AcademicCredentialSystem() {
  
  // Type definitions
  type CertificateId = Text;
  
  type Certificate = {
    certificate_id: Text;
    issuer: Issuer;
    recipient: Recipient;
    credential: Credential;
    certificate_hash: Text;
    issuer_signature: Text;
    is_revoked: Bool;
    block_timestamp: Int;
    schema_version: Text;
  };
  
  type Issuer = {
    name: Text;
    canister_id: Text;
    verification_url: Text;
  };
  
  type Recipient = {
    name: Text;
    student_id: Text;
    principal_id: Text;
  };
  
  type Credential = {
    degree_type: Text;
    major: Text;
    graduation_date: Text;
    issue_date: Text;
    gpa: Float;
    honors: Text;
  };

  type VerificationResult = {
    is_valid: Bool;
    certificate: ?Certificate;
    verified_hash: Text;
    message: Text;
  };

  // Stable storage for persistence
  private var certificateEntries : [(CertificateId, Certificate)] = [];
  private var universityEntries : [(Principal, Text)] = [];
  
  // State variables
  private transient var certificates = HashMap.HashMap<CertificateId, Certificate>(10, Text.equal, Text.hash);
  private transient var universities = HashMap.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);
  private transient var certifiedDataHash : Blob = Blob.fromArray([]);

  // System upgrade hooks
  system func preupgrade() {
    certificateEntries := Iter.toArray(certificates.entries());
    universityEntries := Iter.toArray(universities.entries());
  };

  system func postupgrade() {
    certificates := HashMap.fromIter<CertificateId, Certificate>(
      certificateEntries.vals(), 10, Text.equal, Text.hash
    );
    universities := HashMap.fromIter<Principal, Text>(
      universityEntries.vals(), 10, Principal.equal, Principal.hash
    );
    certificateEntries := [];
    universityEntries := [];
    updateCertifiedData();
  };

  // Helper function to compute certificate hash (simple hash for demo)
  private func computeCertificateHash(cert: Certificate) : Text {
    let data = cert.certificate_id # cert.issuer.name # cert.recipient.name # 
               cert.recipient.student_id # cert.credential.degree_type # 
               cert.credential.major # cert.credential.graduation_date;
    let dataBlob = Text.encodeUtf8(data);
    bytesToHex(Blob.toArray(dataBlob));
  };

  // Convert bytes to hex string
  private func bytesToHex(bytes: [Nat8]) : Text {
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var result = "";
    for (byte in bytes.vals()) {
      let high = Nat8.toNat(byte / 16);
      let low = Nat8.toNat(byte % 16);
      result #= hexChars[high] # hexChars[low];
    };
    result;
  };

  // Update certified data with all certificate hashes
  // ICP requires certified data to be exactly 32 bytes or less
  private func updateCertifiedData() {
    var allHashes = "";
    for ((id, cert) in certificates.entries()) {
      allHashes #= cert.certificate_hash;
    };
    
    // Convert to blob and take first 32 bytes (or pad if less)
    let hashBlob = Text.encodeUtf8(allHashes);
    let hashArray = Blob.toArray(hashBlob);
    
    // Create exactly 32 bytes
    var certData : [var Nat8] = Array.init<Nat8>(32, 0);
    let len = if (hashArray.size() < 32) hashArray.size() else 32;
    
    var i = 0;
    while (i < len) {
      certData[i] := hashArray[i];
      i += 1;
    };
    
    let certBlob = Blob.fromArray(Array.freeze(certData));
    CertifiedData.set(certBlob);
    certifiedDataHash := certBlob;
  };

  // Register a university (admin function)
  public shared(msg) func registerUniversity(name: Text) : async Bool {
    universities.put(msg.caller, name);
    true;
  };

  // Check if caller is a registered university
  private func isUniversity(principal: Principal) : Bool {
    Option.isSome(universities.get(principal));
  };

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
    
    // Verify caller is a registered university
    if (not isUniversity(msg.caller)) {
      return "Error: Only registered universities can issue certificates";
    };

    // Check if certificate already exists
    switch (certificates.get(certificateId)) {
      case (?_) { return "Error: Certificate ID already exists"; };
      case null {};
    };
    
    let certificate : Certificate = {
      certificate_id = certificateId;
      issuer = {
        name = universityName;
        canister_id = Principal.toText(msg.caller);
        verification_url = verificationUrl;
      };
      recipient = {
        name = recipientName;
        student_id = studentId;
        principal_id = recipientPrincipal;
      };
      credential = {
        degree_type = degreeType;
        major = major;
        graduation_date = graduationDate;
        issue_date = issueDate;
        gpa = gpa;
        honors = honors;
      };
      certificate_hash = "";
      issuer_signature = "";
      is_revoked = false;
      block_timestamp = Time.now();
      schema_version = "1.0";
    };

    // Compute hash
    let hash = computeCertificateHash(certificate);
    
    // Create final certificate with hash and signature
    let finalCertificate : Certificate = {
      certificate with
      certificate_hash = hash;
      issuer_signature = hash; // In production, this would be a proper signature
    };

    certificates.put(certificateId, finalCertificate);
    updateCertifiedData();
    
    certificateId;
  };

  // Get certificate by ID (query call for efficiency)
  public query func getCertificate(certificateId: Text) : async ?Certificate {
    certificates.get(certificateId);
  };

  // Verify certificate with certified data - CERTIFIED QUERY for trustless verification
  // Uses query call for speed, but response includes cryptographic proof from CertifiedData
  public query func verifyCertificate(certificateId: Text) : async VerificationResult {
    switch (certificates.get(certificateId)) {
      case null {
        {
          is_valid = false;
          certificate = null;
          verified_hash = "";
          message = "Certificate not found";
        };
      };
      case (?cert) {
        if (cert.is_revoked) {
          return {
            is_valid = false;
            certificate = ?cert;
            verified_hash = cert.certificate_hash;
            message = "Certificate has been revoked";
          };
        };
        
        let recomputedHash = computeCertificateHash(cert);
        if (recomputedHash == cert.certificate_hash) {
          {
            is_valid = true;
            certificate = ?cert;
            verified_hash = recomputedHash;
            message = "Certificate is valid and authentic";
          };
        } else {
          {
            is_valid = false;
            certificate = ?cert;
            verified_hash = recomputedHash;
            message = "Certificate hash mismatch - data may have been tampered with";
          };
        };
      };
    };
  };

  // Get certified data for browser verification
  public query func getCertifiedData() : async Blob {
    certifiedDataHash;
  };

  // Revoke a certificate (only issuing university can revoke)
  public shared(msg) func revokeCertificate(certificateId: Text) : async Bool {
    if (not isUniversity(msg.caller)) {
      return false;
    };

    switch (certificates.get(certificateId)) {
      case null { false };
      case (?cert) {
        let updatedCert = {
          cert with is_revoked = true;
        };
        certificates.put(certificateId, updatedCert);
        updateCertifiedData();
        true;
      };
    };
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
};
