// MerkleTree.mo - Merkle tree with O(log n) incremental insertion
//
// Uses a flat array that mirrors a complete binary tree:
//   index 0 = root, children of i are 2i+1 and 2i+2.
//
// insertLeaf:         O(log n) — appends one leaf and recomputes path to root.
// buildFromCerts:     O(n)     — full rebuild (used only at postupgrade).
// getProofByIndex:    O(log n) — walks from leaf to root collecting siblings.

import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Types "./Types";
import Utils "./Utils";

module {
  public type Certificate = Types.Certificate;
  public type MerkleNode = Types.MerkleNode;

  let EMPTY : Text = "0000000000000000000000000000000000000000000000000000000000000000";

  // ── Tree state (kept by the actor as transient vars) ────────────────

  public type TreeState = {
    var leaves : Buffer.Buffer<Text>;
    var nodes  : [var Text];
    var cap    : Nat;
  };

  public func emptyState() : TreeState {
    { var leaves = Buffer.Buffer<Text>(64);
      var nodes  = Array.init<Text>(1, EMPTY);
      var cap    = 1 };
  };

  // ── helpers ─────────────────────────────────────────────────────────

  func nextPow2(n : Nat) : Nat {
    if (n == 0) return 1;
    var p : Nat = 1;
    while (p < n) { p *= 2 };
    p;
  };

  func treeSize(cap : Nat) : Nat { 2 * cap - 1 };

  func parentHash(l : Text, r : Text) : Text {
    if (l == EMPTY and r == EMPTY) { EMPTY }
    else { Utils.combineHashes(l, r) };
  };

  func rebuildInternal(state : TreeState) {
    let sz = state.nodes.size();
    if (sz <= 1) return;
    var idx : Int = (sz : Int) - 3;
    while (idx >= 0) {
      let j = Int.abs(idx);
      state.nodes[j] := parentHash(state.nodes[2 * j + 1], state.nodes[2 * j + 2]);
      idx -= 1;
    };
  };

  func placeLeaves(state : TreeState) {
    let offset = state.cap - 1;
    var i = 0;
    let n = state.leaves.size();
    while (i < n) {
      state.nodes[offset + i] := state.leaves.get(i);
      i += 1;
    };
  };

  // ── public API ──────────────────────────────────────────────────────

  /// Full rebuild from certificate map.  O(n).  Used only in postupgrade.
  public func buildFromCerts(
    certificates : HashMap.HashMap<Text, Certificate>,
    state        : TreeState,
  ) : Text {
    state.leaves := Buffer.Buffer<Text>(certificates.size());
    for ((_, cert) in certificates.entries()) {
      state.leaves.add(cert.certificate_hash);
    };
    let n = state.leaves.size();
    if (n == 0) { state.cap := 1; state.nodes := Array.init<Text>(1, EMPTY); return EMPTY };

    state.cap := nextPow2(n);
    state.nodes := Array.init<Text>(treeSize(state.cap), EMPTY);
    placeLeaves(state);
    rebuildInternal(state);
    state.nodes[0];
  };

  /// Insert one leaf.  Amortised O(log n).
  public func insertLeaf(leafHash : Text, state : TreeState) : Text {
    let n = state.leaves.size();

    // Grow tree when at capacity
    if (n >= state.cap) {
      let newCap = if (state.cap == 0) 1 else state.cap * 2;
      state.nodes := Array.init<Text>(treeSize(newCap), EMPTY);
      state.cap   := newCap;
      placeLeaves(state);
      rebuildInternal(state);
    };

    state.leaves.add(leafHash);
    let leafIdx = state.cap - 1 + n;
    state.nodes[leafIdx] := leafHash;

    // Walk up to root — O(log n)
    var cur = leafIdx;
    while (cur > 0) {
      let p = (cur - 1) / 2;
      state.nodes[p] := parentHash(state.nodes[2 * p + 1], state.nodes[2 * p + 2]);
      cur := p;
    };

    state.nodes[0];
  };

  /// Merkle proof for a leaf hash.  O(n) scan to find + O(log n) walk.
  public func getProof(leafHash : Text, state : TreeState) : [Text] {
    let offset = state.cap - 1;
    let n = state.leaves.size();
    var leafIdx : Nat = 0;
    var found = false;
    var i = 0;
    while (i < n) {
      if (state.leaves.get(i) == leafHash) { leafIdx := offset + i; found := true };
      i += 1;
    };
    if (not found) { return [] };

    let proof = Buffer.Buffer<Text>(16);
    var cur = leafIdx;
    while (cur > 0) {
      let sibling = if (cur % 2 == 1) { cur + 1 } else { cur - 1 };
      if (sibling < state.nodes.size()) { proof.add(state.nodes[sibling]) };
      cur := (cur - 1) / 2;
    };
    Buffer.toArray(proof);
  };

  /// Verify a proof.
  public func verifyProof(leafHash : Text, proof : [Text], merkleRoot : Text) : Bool {
    var currentHash = leafHash;
    for (siblingHash in proof.vals()) {
      currentHash := Utils.combineHashes(currentHash, siblingHash);
    };
    currentHash == merkleRoot;
  };

  /// Get the current root from state.
  public func getRoot(state : TreeState) : Text { state.nodes[0] };
};

