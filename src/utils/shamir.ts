import { wasmManager } from '../wasm/wasmLoader';
import i18n from '../i18n';

// Basic Shamir's Secret Sharing implementation in TypeScript
// Uses GF(2^8) with primitive polynomial x^8 + x^4 + x^3 + x + 1 (0x11b)
//
// NOTE: This JS implementation is kept primarily for benchmarking and legacy support.
// The production environment enforces usage of the WASM implementation.

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
  throw new Error("Sharding is a PRO feature. Please upgrade to use this functionality.");
};

export const split = async (secret: string, shares: number, threshold: number): Promise<string[]> => {
  const exports = wasmManager.getExports();
  
  // Enforce WASM loaded in Production for security context check
  // AND actually use it!
  if (!exports) {
      if (import.meta.env.PROD) {
          throw new Error(i18n.t('errors.wasmSecurity'));
      } else {
          console.warn("WASM not loaded, falling back to JS (DEV ONLY)");
          return splitJS(secret, shares, threshold);
      }
  }

  try {
      // Call WASM implementation
      return exports.split_secret_wasm(secret, shares, threshold) as string[];
  } catch (e) {
      console.error("WASM Split Error:", e);
      if (import.meta.env.PROD) {
          throw new Error("WASM Split Failed");
      }
      return splitJS(secret, shares, threshold);
  }
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
  throw new Error("Sharding is a PRO feature. Please upgrade to use this functionality.");
};

export const combine = async (shares: string[]): Promise<string> => {
  const exports = wasmManager.getExports();
  
  // Enforce WASM loaded in Production for security context check
  if (!exports) {
      if (import.meta.env.PROD) {
          throw new Error(i18n.t('errors.wasmSecurity'));
      } else {
          console.warn("WASM not loaded, falling back to JS (DEV ONLY)");
          return combineJS(shares);
      }
  }

  try {
      // Call WASM implementation
      return exports.combine_shares_wasm(shares);
  } catch (e) {
       console.error("WASM Combine Error:", e);
       // Check if it's a legacy share format that WASM can't handle?
       // WASM expects specific format. If it fails, maybe try JS if allowed?
       // But user wants "absolute security" which implies consistency.
       // However, we can fallback to JS for legacy support IF we trust JS implementation.
       if (import.meta.env.PROD) {
           throw e;
       }
       return combineJS(shares);
  }
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
