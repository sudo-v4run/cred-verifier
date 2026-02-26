// Types.mo - Type definitions for the credential system

module {
  // Basic type aliases
  public type CertificateId = Text;
  
  // Core data structures
  public type Certificate = {
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
  
  public type Issuer = {
    name: Text;
    canister_id: Text;
    verification_url: Text;
  };
  
  public type Recipient = {
    name: Text;
    student_id: Text;
    principal_id: Text;
  };
  
  public type Credential = {
    degree_type: Text;
    major: Text;
    graduation_date: Text;
    issue_date: Text;
    gpa: Float;
    honors: Text;
  };

  // Result types
  public type VerificationResult = {
    is_valid: Bool;
    certificate: ?Certificate;
    verified_hash: Text;
    merkle_proof: [Text];
    merkle_root: Text;
    message: Text;
  };

  // Merkle tree node structure
  public type MerkleNode = {
    hash: Text;
    left: ?Text;    // Hash of left child (null for leaf nodes)
    right: ?Text;   // Hash of right child (null for leaf nodes)
    parent: ?Text;  // Hash of parent node (null for root)
    sibling: ?Text; // Hash of sibling used in proof path (null for root or unpaired odd node)
  };
};
