// CertificateManager.mo - Certificate operations (issue, verify, revoke)

import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Types "./Types";
import Utils "./Utils";

module {
  public type Certificate = Types.Certificate;
  public type Issuer = Types.Issuer;
  public type Recipient = Types.Recipient;
  public type Credential = Types.Credential;
  public type VerificationResult = Types.VerificationResult;

  // Helper function to compute certificate hash (simple hash for demo)
  public func computeCertificateHash(cert: Certificate) : Text {
    let data = cert.certificate_id # cert.issuer.name # cert.recipient.name # 
               cert.recipient.student_id # cert.credential.degree_type # 
               cert.credential.major # cert.credential.graduation_date;
    let dataBlob = Text.encodeUtf8(data);
    Utils.bytesToHex(Blob.toArray(dataBlob));
  };

  // Create a new certificate
  public func createCertificate(
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
    honors: Text,
    callerPrincipal: Principal
  ) : Certificate {
    let certificate : Certificate = {
      certificate_id = certificateId;
      issuer = {
        name = universityName;
        canister_id = Principal.toText(callerPrincipal);
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
    {
      certificate with
      certificate_hash = hash;
      issuer_signature = hash; // In production, this would be a proper signature
    };
  };

  // Verify a certificate
  public func verifyCertificate(
    cert: Certificate,
    merkleProof: [Text],
    merkleRoot: Text
  ) : VerificationResult {
    if (cert.is_revoked) {
      return {
        is_valid = false;
        certificate = ?cert;
        verified_hash = cert.certificate_hash;
        merkle_proof = [];
        merkle_root = merkleRoot;
        message = "Certificate has been revoked";
      };
    };
    
    let recomputedHash = computeCertificateHash(cert);
    
    if (recomputedHash == cert.certificate_hash) {
      {
        is_valid = true;
        certificate = ?cert;
        verified_hash = recomputedHash;
        merkle_proof = merkleProof;
        merkle_root = merkleRoot;
        message = "Certificate is valid and authentic";
      };
    } else {
      {
        is_valid = false;
        certificate = ?cert;
        verified_hash = recomputedHash;
        merkle_proof = merkleProof;
        merkle_root = merkleRoot;
        message = "Certificate hash mismatch - data may have been tampered with";
      };
    };
  };

  // Mark a certificate as revoked
  public func revokeCertificate(cert: Certificate) : Certificate {
    {
      cert with is_revoked = true;
    };
  };
};
