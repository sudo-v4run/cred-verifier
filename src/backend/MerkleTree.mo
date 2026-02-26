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

  // Build Merkle tree from certificate hashes.
  // Populates merkleNodes with parent + sibling links so that getMerkleProof
  // can walk the pre-built tree upward in O(log n) without any re-computation.
  // The caller is expected to pass a freshly-created (empty) merkleNodes map
  // so there is no need to clear it here.
  public func buildMerkleTree(
    certificates: HashMap.HashMap<Text, Certificate>,
    merkleNodes: HashMap.HashMap<Text, MerkleNode>
  ) : Text {
    // Collect leaf hashes and seed the tree with leaf nodes
    let leaves = Buffer.Buffer<Text>(certificates.size());
    for ((_, cert) in certificates.entries()) {
      let h = cert.certificate_hash;
      leaves.add(h);
      merkleNodes.put(h, {
        hash    = h;
        left    = null;
        right   = null;
        parent  = null;
        sibling = null;
      });
    };

    let leafCount = leaves.size();

    if (leafCount == 0) {
      return Utils.bytesToHex(Array.freeze(Array.init<Nat8>(32, 0)));
    };

    if (leafCount == 1) {
      return leaves.get(0);
    };

    // Bottom-up build: currentLevel holds the hashes at the current depth.
    // For each pair (left, right) we:
    //   1. compute the parent hash,
    //   2. back-patch parent + sibling onto the two children already stored,
    //   3. store the new parent node (its own parent/sibling will be set when
    //      it is processed in the next iteration).
    var currentLevel : [Text] = Buffer.toArray(leaves);

    while (currentLevel.size() > 1) {
      let nextLevel = Buffer.Buffer<Text>(0);
      var i = 0;

      while (i < currentLevel.size()) {
        if (i + 1 < currentLevel.size()) {
          let leftHash  = currentLevel[i];
          let rightHash = currentLevel[i + 1];
          let parentHash = Utils.combineHashes(leftHash, rightHash);

          // Back-patch the left child
          switch (merkleNodes.get(leftHash)) {
            case (?n) {
              merkleNodes.put(leftHash, { n with parent = ?parentHash; sibling = ?rightHash });
            };
            case null {};
          };

          // Back-patch the right child
          switch (merkleNodes.get(rightHash)) {
            case (?n) {
              merkleNodes.put(rightHash, { n with parent = ?parentHash; sibling = ?leftHash });
            };
            case null {};
          };

          // Store the parent (parent/sibling filled in during the next level)
          merkleNodes.put(parentHash, {
            hash    = parentHash;
            left    = ?leftHash;
            right   = ?rightHash;
            parent  = null;
            sibling = null;
          });

          nextLevel.add(parentHash);
          i += 2;
        } else {
          // Odd node: promoted unchanged; its parent will be set next level.
          nextLevel.add(currentLevel[i]);
          i += 1;
        };
      };

      currentLevel := Buffer.toArray(nextLevel);
    };

    // Return root hash
    currentLevel[0];
  };

  // Return the Merkle proof (list of sibling hashes from leaf to root) for
  // the given leaf hash. Requires that buildMerkleTree has already been called
  // with the same merkleNodes map.
  //
  // Complexity: O(log n) — walks upward via stored parent links.
  public func getMerkleProof(
    targetHash: Text,
    merkleNodes: HashMap.HashMap<Text, MerkleNode>
  ) : [Text] {
    let proof = Buffer.Buffer<Text>(16);
    var current = targetHash;
    var running = true;

    while (running) {
      switch (merkleNodes.get(current)) {
        case null { running := false };
        case (?node) {
          // Collect sibling (absent for root or an unpaired odd node)
          switch (node.sibling) {
            case (?s) { proof.add(s) };
            case null {};
          };
          // Climb to parent; stop at root (parent == null)
          switch (node.parent) {
            case null    { running := false };
            case (?p)    { current := p };
          };
        };
      };
    };

    Buffer.toArray(proof);
  };

  // Verify a Merkle proof: recompute the root from the leaf and confirm it
  // matches the stored root.
  public func verifyProof(leafHash: Text, proof: [Text], merkleRoot: Text) : Bool {
    var currentHash = leafHash;
    for (siblingHash in proof.vals()) {
      currentHash := Utils.combineHashes(currentHash, siblingHash);
    };
    currentHash == merkleRoot;
  };
};

