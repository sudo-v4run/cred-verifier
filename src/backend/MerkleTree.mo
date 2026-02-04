// MerkleTree.mo - Merkle tree construction and proof generation

import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Types "./Types";
import Utils "./Utils";

module {
  public type Certificate = Types.Certificate;
  public type MerkleNode = Types.MerkleNode;

  // Build Merkle tree from certificate hashes
  public func buildMerkleTree(
    certificates: HashMap.HashMap<Text, Certificate>,
    merkleNodes: HashMap.HashMap<Text, MerkleNode>
  ) : Text {
    // Clear existing nodes
    for ((key, _) in merkleNodes.entries()) {
      merkleNodes.delete(key);
    };
    
    // Get all certificate hashes as leaf nodes
    let certHashes = Buffer.Buffer<Text>(0);
    for ((id, cert) in certificates.entries()) {
      certHashes.add(cert.certificate_hash);
    };
    
    // If no certificates, return empty hash
    if (certHashes.size() == 0) {
      return Utils.bytesToHex(Array.freeze(Array.init<Nat8>(32, 0)));
    };
    
    // If only one certificate, return its hash
    if (certHashes.size() == 1) {
      return certHashes.get(0);
    };
    
    // Build tree bottom-up
    var currentLevel = Buffer.Buffer<Text>(0);
    for (hash in certHashes.vals()) {
      currentLevel.add(hash);
      // Store leaf nodes
      merkleNodes.put(hash, {
        hash = hash;
        left = null;
        right = null;
      });
    };
    
    // Build intermediate levels
    while (currentLevel.size() > 1) {
      let nextLevel = Buffer.Buffer<Text>(0);
      var i = 0;
      
      while (i < currentLevel.size()) {
        if (i + 1 < currentLevel.size()) {
          // Pair exists
          let leftHash = currentLevel.get(i);
          let rightHash = currentLevel.get(i + 1);
          let parentHash = Utils.combineHashes(leftHash, rightHash);
          
          // Store parent node
          merkleNodes.put(parentHash, {
            hash = parentHash;
            left = ?leftHash;
            right = ?rightHash;
          });
          
          nextLevel.add(parentHash);
          i += 2;
        } else {
          // Odd node out, promote to next level
          let singleHash = currentLevel.get(i);
          nextLevel.add(singleHash);
          i += 1;
        };
      };
      
      currentLevel := nextLevel;
    };
    
    // Return root hash
    currentLevel.get(0);
  };

  // Get Merkle proof for a specific certificate hash
  public func getMerkleProof(
    targetHash: Text,
    certificates: HashMap.HashMap<Text, Certificate>
  ) : [Text] {
    let proof = Buffer.Buffer<Text>(0);
    
    // Build current level with all certificate hashes
    let certHashes = Buffer.Buffer<Text>(0);
    for ((id, cert) in certificates.entries()) {
      certHashes.add(cert.certificate_hash);
    };
    
    if (certHashes.size() <= 1) {
      return [];
    };
    
    var currentLevel = Buffer.Buffer<Text>(0);
    for (hash in certHashes.vals()) {
      currentLevel.add(hash);
    };
    
    var targetIndex : ?Nat = null;
    
    // Find target in current level
    var idx = 0;
    for (hash in currentLevel.vals()) {
      if (hash == targetHash) {
        targetIndex := ?idx;
      };
      idx += 1;
    };
    
    // If target not found, return empty proof
    switch (targetIndex) {
      case null { return []; };
      case (?index) {
        var currentIndex = index;
        
        // Build proof by traversing up the tree
        while (currentLevel.size() > 1) {
          let nextLevel = Buffer.Buffer<Text>(0);
          var i = 0;
          
          while (i < currentLevel.size()) {
            if (i + 1 < currentLevel.size()) {
              let leftHash = currentLevel.get(i);
              let rightHash = currentLevel.get(i + 1);
              let parentHash = Utils.combineHashes(leftHash, rightHash);
              
              // If current index is in this pair, add sibling to proof
              if (i == currentIndex) {
                proof.add(rightHash);
                currentIndex := nextLevel.size();
              } else if (i + 1 == currentIndex) {
                proof.add(leftHash);
                currentIndex := nextLevel.size();
              };
              
              nextLevel.add(parentHash);
              i += 2;
            } else {
              // Odd node out
              if (i == currentIndex) {
                currentIndex := nextLevel.size();
              };
              nextLevel.add(currentLevel.get(i));
              i += 1;
            };
          };
          
          currentLevel := nextLevel;
        };
      };
    };
    
    Buffer.toArray(proof);
  };

  // Verify Merkle proof for a given hash
  public func verifyProof(leafHash: Text, proof: [Text], merkleRoot: Text) : Bool {
    var currentHash = leafHash;
    
    for (siblingHash in proof.vals()) {
      currentHash := Utils.combineHashes(currentHash, siblingHash);
    };
    
    currentHash == merkleRoot;
  };
};
