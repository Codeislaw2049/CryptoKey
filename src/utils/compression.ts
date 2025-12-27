import { compress, decompress } from 'lzma';
import CryptoJS from 'crypto-js';

// Type definitions for LZMA
// Since @types/lzma might not be available or perfect, we treat it carefully.
// lzma package usually exposes compress and decompress.

export interface QRChunk {
  index: number;
  total: number;
  hash: string;
  data: string;
}

/**
 * Compresses a string using LZMA and returns a Base64URL string.
 * @param data The string to compress
 * @param mode Compression mode (1-9), default 9 for max compression
 */
export const compressData = (data: string, mode: number = 9): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting LZMA compression, length:', data.length);
      compress(data, mode, (result: number[], error: Error | null) => {
        if (error) {
          console.error('LZMA Compression Callback Error:', error);
          reject(error);
          return;
        }
        // result is an array of bytes (signed integers)
        // Convert to Base64
        try {
           const uint8Array = new Uint8Array(result);
           const base64 = uint8ArrayToBase64(uint8Array);
           resolve(toBase64URL(base64));
        } catch (convErr) {
           console.error('LZMA Output Conversion Error:', convErr);
           reject(convErr);
        }
      });
    } catch (e) {
      console.error('LZMA Invocation Error:', e);
      reject(e);
    }
  });
};

/**
 * Decompresses a Base64URL string using LZMA.
 * @param base64URL The compressed data
 */
export const decompressData = (base64URL: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const base64 = fromBase64URL(base64URL);
      const uint8Array = base64ToUint8Array(base64);
      // lzma decompress expects array of numbers (bytes)
      // It can handle Uint8Array or Array
      decompress(uint8Array, (result, error) => {
        if (error) {
          reject(error);
          return;
        }
        if (typeof result === 'string') {
          resolve(result);
        } else {
           // Fallback if it returns byte array
           resolve(new TextDecoder().decode(new Uint8Array(result as number[])));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Splits the compressed string into chunks with metadata.
 * Format: "v1|total|index|hash|chunkData"
 */
export const createChunks = (compressedData: string, maxChunkSize: number = 4000): string[] => {
  // Calculate Global Hash of the compressed data for integrity verification
  const hash = CryptoJS.SHA256(compressedData).toString(CryptoJS.enc.Base64);
  const safeHash = toBase64URL(hash).substring(0, 10); // Short hash for metadata

  const chunks: string[] = [];
  const totalLength = compressedData.length;
  // Estimate metadata size ~ 20-30 chars: "v1|99|99|abcdef1234|"
  // Real payload per chunk
  const metadataSizeEstimate = 30;
  const payloadSize = maxChunkSize - metadataSizeEstimate;
  
  const totalChunks = Math.ceil(totalLength / payloadSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * payloadSize;
    const end = Math.min(start + payloadSize, totalLength);
    const chunkData = compressedData.substring(start, end);
    
    // Format: v1|total|index|hash|data
    // Index is 1-based for user friendliness
    const chunk = `v1|${totalChunks}|${i + 1}|${safeHash}|${chunkData}`;
    chunks.push(chunk);
  }

  return chunks;
};

/**
 * Parses a raw chunk string into a QRChunk object.
 */
export const parseChunk = (rawChunk: string): QRChunk | null => {
  try {
    const parts = rawChunk.split('|');
    if (parts.length !== 5 || parts[0] !== 'v1') return null;
    
    return {
      total: parseInt(parts[1], 10),
      index: parseInt(parts[2], 10),
      hash: parts[3],
      data: parts[4]
    };
  } catch (e) {
    return null;
  }
};

/**
 * Verifies the integrity of the reassembled compressed data against the hash from chunks.
 */
export const verifyIntegrity = (compressedData: string, expectedSafeHash: string): boolean => {
  try {
    const hash = CryptoJS.SHA256(compressedData).toString(CryptoJS.enc.Base64);
    const safeHash = toBase64URL(hash).substring(0, 10);
    return safeHash === expectedSafeHash;
  } catch (e) {
    console.error('Integrity check error:', e);
    return false;
  }
};

/**
 * Helper: Uint8Array to Base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper: Base64 to Base64URL
 */
function toBase64URL(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Helper: Base64URL to Base64
 */
function fromBase64URL(base64URL: string): string {
  let base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}
