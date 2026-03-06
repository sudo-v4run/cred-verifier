// Utils.mo - Utility functions for hashing and data conversion

import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Char "mo:base/Char";

module {
  // Convert bytes to hexadecimal string.
  // O(N) — builds a Char array in a single Array.tabulate pass, then
  // creates exactly one Text value.  The previous loop-based version used
  // `result #= …` which copies the accumulator on every iteration, giving
  // O(N²) allocations and severe Motoko GC pressure on the IC.
  public func bytesToHex(bytes: [Nat8]) : Text {
    let hexChars : [Char] = [
      '0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'
    ];
    let chars = Array.tabulate<Char>(bytes.size() * 2, func(i : Nat) : Char {
      let byte = bytes[i / 2];
      let nibble = if (i % 2 == 0) Nat8.toNat(byte / 16)
                                   else Nat8.toNat(byte % 16);
      hexChars[nibble]
    });
    Text.fromIter(chars.vals())
  };

  // Combine two hex-string hashes into a new hash.
  // Iterates the chars of `left` then `right` directly — avoids allocating
  // a concatenated string, a Blob, and an intermediate byte array, which
  // the previous version did on every Merkle tree node update.
  public func combineHashes(left: Text, right: Text) : Text {
    var hashBytes : [var Nat8] = Array.init<Nat8>(32, 0);
    var i = 0;
    for (c in left.chars()) {
      let byte = Nat8.fromNat(Nat32.toNat(Char.toNat32(c)));
      hashBytes[i % 32] := hashBytes[i % 32] ^ byte;
      i += 1;
    };
    for (c in right.chars()) {
      let byte = Nat8.fromNat(Nat32.toNat(Char.toNat32(c)));
      hashBytes[i % 32] := hashBytes[i % 32] ^ byte;
      i += 1;
    };
    bytesToHex(Array.freeze(hashBytes))
  };

  // Convert text to 32-byte blob (for certified data)
  public func textTo32ByteBlob(text: Text) : Blob {
    let textBlob = Text.encodeUtf8(text);
    let textArray = Blob.toArray(textBlob);
    
    // Create exactly 32 bytes
    var certData : [var Nat8] = Array.init<Nat8>(32, 0);
    let len = if (textArray.size() < 32) textArray.size() else 32;
    
    var i = 0;
    while (i < len) {
      certData[i] := textArray[i];
      i += 1;
    };
    
    Blob.fromArray(Array.freeze(certData));
  };
};
