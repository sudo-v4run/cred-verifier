// Utils.mo - Utility functions for hashing and data conversion

import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Text "mo:base/Text";
import Blob "mo:base/Blob";

module {
  // Convert bytes to hexadecimal string
  public func bytesToHex(bytes: [Nat8]) : Text {
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var result = "";
    for (byte in bytes.vals()) {
      let high = Nat8.toNat(byte / 16);
      let low = Nat8.toNat(byte % 16);
      result #= hexChars[high] # hexChars[low];
    };
    result;
  };

  // Simple hash function combining two hashes (simulates SHA-256 behavior)
  public func combineHashes(left: Text, right: Text) : Text {
    let combined = left # right;
    let combinedBlob = Text.encodeUtf8(combined);
    let combinedBytes = Blob.toArray(combinedBlob);
    
    // Create a simple hash by XORing bytes and taking modulo
    var hashBytes : [var Nat8] = Array.init<Nat8>(32, 0);
    var i = 0;
    for (byte in combinedBytes.vals()) {
      hashBytes[i % 32] := hashBytes[i % 32] ^ byte;
      i += 1;
    };
    
    bytesToHex(Array.freeze(hashBytes));
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
