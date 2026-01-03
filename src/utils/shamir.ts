// import { wasmManager } from '../wasm/wasmLoader';

// Basic Shamir's Secret Sharing implementation in TypeScript
// Uses GF(2^8) with primitive polynomial x^8 + x^4 + x^3 + x + 1 (0x11b)

// Global tables for GF(2^8) arithmetic
const LOG: number[] = [];
const EXP: number[] = [];

// Initialize tables
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // Multiply x by 3 (generator for 0x11b)
    // x * 3 = x * (2 + 1) = (x * 2) ^ x
    let x2 = x << 1;
    if (x2 & 0x100) x2 ^= 0x11b; // Primitive polynomial 0x11b
    x = x2 ^ x;
  }
  // LOG[0] is undefined (or handled specially)
})();

// GF(2^8) Addition (XOR)
const add = (a: number, b: number): number => a ^ b;

// GF(2^8) Subtraction (XOR)
const sub = (a: number, b: number): number => a ^ b;

// GF(2^8) Multiplication
const mul = (a: number, b: number): number => {
  if (a === 0 || b === 0) return 0;
  const logA = LOG[a];
  const logB = LOG[b];
  if (logA === undefined || logB === undefined) return 0; // Should not happen for non-zero
  return EXP[(logA + logB) % 255];
};

// GF(2^8) Division
const div = (a: number, b: number): number => {
  if (b === 0) throw new Error("Division by zero");
  if (a === 0) return 0;
  const logA = LOG[a];
  const logB = LOG[b];
  return EXP[(logA - logB + 255) % 255];
};

// Convert string to hex (UTF-8 aware)
const strToHex = (str: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Convert hex to string (UTF-8 aware)
export const hexToStr = (hex: string): string => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

// Generate random byte
const randomByte = (): number => {
  const array = new Uint8Array(1);
  crypto.getRandomValues(array);
  return array[0];
};

// Helper: Calculate SHA-256 hash of a string
export const sha256 = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Split a secret into N shares, with threshold K needed to reconstruct.
 * Adds a SHA-256 checksum to ensure integrity upon reconstruction.
 * @param secret The secret string
 * @param shares Total number of shares to generate (N)
 * @param threshold Minimum shares needed to reconstruct (K)
 * @returns Array of shares strings, format "id-hexdata"
 */
export const splitJS = async (secret: string, shares: number, threshold: number): Promise<string[]> => {
  if (threshold > shares) throw new Error("Threshold cannot be greater than total shares");
  if (threshold < 2) throw new Error("Threshold must be at least 2");

  // Calculate checksum
  const checksum = await sha256(secret);
  // Payload format: CHECKSUM(64 chars)|SECRET
  const payload = `${checksum}|${secret}`;

  const hexSecret = strToHex(payload);
  const secretBytes = [];
  for (let i = 0; i < hexSecret.length; i += 2) {
    secretBytes.push(parseInt(hexSecret.substr(i, 2), 16));
  }

  // Generate random polynomials for each byte of the secret
  const polynomials = [];
  for (let i = 0; i < secretBytes.length; i++) {
    const coeffs = [secretBytes[i]]; // a0 is the secret byte
    for (let j = 1; j < threshold; j++) {
      let r = randomByte();
      coeffs.push(r);
    }
    polynomials.push(coeffs);
  }

  // Generate shares
  const resultShares: string[] = [];
  for (let i = 1; i <= shares; i++) {
    let shareBytes = '';
    for (let j = 0; j < polynomials.length; j++) {
      const coeffs = polynomials[j];
      let val = coeffs[0];
      for (let k = 1; k < coeffs.length; k++) {
        const term = mul(coeffs[k], getPower(i, k));
        val = add(val, term);
      }
      shareBytes += val.toString(16).padStart(2, '0');
    }
    resultShares.push(`${i}-${shareBytes}`);
  }

  return resultShares;
};

export const split = async (secret: string, shares: number, threshold: number): Promise<string[]> => {
  /*
  const exports = wasmManager.getExports();
  if (exports) {
    try {
      console.log("Using Wasm for Split");
      return exports.split_secret(secret, shares, threshold);
    } catch (e) {
      console.warn("Wasm Split failed, falling back to JS", e);
    }
  }
  */
  return splitJS(secret, shares, threshold);
};

// Helper for power
const getPower = (base: number, exp: number): number => {
  if (exp === 0) return 1;
  let res = 1;
  for (let i = 0; i < exp; i++) {
    res = mul(res, base);
  }
  return res;
};

/**
 * Combine shares to reconstruct the secret.
 * Verifies SHA-256 checksum to ensure data integrity.
 * @param shares Array of share strings (format "id-hexdata")
 * @returns The reconstructed secret string
 */
export const combineJS = async (shares: string[]): Promise<string> => {
  if (shares.length === 0) return '';

  // Parse shares
  const parsedShares: { x: number; data: number[] }[] = [];
  let dataLength = -1;

  for (const share of shares) {
      const parts = share.split('-');
      if (parts.length !== 2) continue;
      
      const x = parseInt(parts[0], 10);
      const hexData = parts[1];
      
      const dataBytes = [];
      for (let i = 0; i < hexData.length; i += 2) {
          dataBytes.push(parseInt(hexData.substr(i, 2), 16));
      }
      
      if (dataLength === -1) {
          dataLength = dataBytes.length;
      } else if (dataLength !== dataBytes.length) {
          continue; 
      }
      
      // Check for duplicates
      if (!parsedShares.some(s => s.x === x)) {
        parsedShares.push({ x, data: dataBytes });
      }
  }

  if (parsedShares.length < 2) {
      throw new Error("Not enough valid shares to reconstruct");
  }

  let reconstructedHex = '';
  
  for (let byteIdx = 0; byteIdx < dataLength; byteIdx++) {
      let result = 0;
      for (let i = 0; i < parsedShares.length; i++) {
          const xi = parsedShares[i].x;
          const yi = parsedShares[i].data[byteIdx];
          let numerator = 1;
          let denominator = 1;
          for (let j = 0; j < parsedShares.length; j++) {
              if (i === j) continue;
              const xj = parsedShares[j].x;
              numerator = mul(numerator, xj);
              denominator = mul(denominator, sub(xi, xj));
          }
          const lagrange = mul(yi, div(numerator, denominator));
          result = add(result, lagrange);
      }
      reconstructedHex += result.toString(16).padStart(2, '0');
  }

  const reconstructedPayload = hexToStr(reconstructedHex);
  
  // Verify Checksum
  // Format: CHECKSUM(64 chars)|SECRET
  const separatorIndex = reconstructedPayload.indexOf('|');
  if (separatorIndex === -1 || separatorIndex !== 64) {
      throw new Error("Integrity check failed: Invalid payload format (Checksum mismatch)");
  }

  const extractedChecksum = reconstructedPayload.substring(0, 64);
  const extractedSecret = reconstructedPayload.substring(65);

  const calculatedChecksum = await sha256(extractedSecret);

  if (extractedChecksum !== calculatedChecksum) {
      // Try Legacy Recovery (for shares generated with older versions)
      try {
          const legacySecret = await recoverLegacySecret(reconstructedHex.substring(130), extractedChecksum); // 130 = 64*2 + 2 (|)
          if (legacySecret) return legacySecret;
      } catch (e) {
          console.warn("Legacy recovery failed", e);
      }
      
      throw new Error("Integrity check failed: Checksum mismatch (Corrupted or wrong shares)");
  }

  return extractedSecret;
};

export const combine = async (shares: string[]): Promise<string> => {
  /*
  const exports = wasmManager.getExports();
  if (exports) {
    try {
      console.log("Using Wasm for Combine");
      return exports.combine_shares(shares);
    } catch (e) {
      console.warn("Wasm Combine failed, falling back to JS", e);
    }
  }
  */
  return combineJS(shares);
};

// Helper to recover secret from legacy hex (mixed length, UTF-16 char codes)
const recoverLegacySecret = async (hexSecretPart: string, targetChecksum: string): Promise<string | null> => {
  const results: string[] = [];
  const MAX_RESULTS = 200; // Limit search space

  // We are grouping bytes (pairs of hex digits) into char codes.
  // e.g. "61" -> \u0061 ('a')
  //      "4e2d" -> \u4e2d ('中')
  
  const solve = (index: number, currentStr: string) => {
    if (results.length >= MAX_RESULTS) return;
    if (index === hexSecretPart.length) {
      results.push(currentStr);
      return;
    }

    // Try consuming 1 byte (2 hex chars) -> 1 char
    if (index + 2 <= hexSecretPart.length) {
      const chunk = hexSecretPart.substr(index, 2);
      const code = parseInt(chunk, 16);
      solve(index + 2, currentStr + String.fromCharCode(code));
    }

    // Try consuming 2 bytes (4 hex chars) -> 1 char
    // Only if result is a valid char code > 255 (optimization, and typical for Chinese)
    // Because if it's < 255, it would have been represented as 1 byte usually (unless padded, but old code didn't pad)
    if (index + 4 <= hexSecretPart.length) {
      const chunk = hexSecretPart.substr(index, 4);
      const code = parseInt(chunk, 16);
      // Heuristic: Prefer 2-byte consumption only if it looks like a wide char
      if (code > 255) { 
        solve(index + 4, currentStr + String.fromCharCode(code));
      }
    }
  };

  solve(0, '');

  for (const candidate of results) {
      const hash = await sha256(candidate);
      if (hash === targetChecksum) return candidate;
  }
  return null;
};
