
/**
 * Binary File Encryption & Sharding Utilities
 * Uses Web Crypto API (AES-256-GCM) and HTML5 File API
 */

interface FileMetadata {
  name: string;
  type: string;
  size: number;
  offset: number;
}

interface PackageHeader {
  version: number;
  files: FileMetadata[];
  totalSize: number;
  compression?: 'gzip' | 'none';
}

import pako from 'pako';
import { wasmManager } from '../wasm/wasmLoader';

// --- Helper: Concat Uint8Arrays ---
const concatBuffers = (buffers: Uint8Array[]): Uint8Array => {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
};

// --- Helper: Hash Data (SHA-256) ---
const sha256 = async (data: BufferSource | Uint8Array): Promise<Uint8Array> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
  return new Uint8Array(hashBuffer);
};

// --- Helper: Hash File to Key (SHA-256 -> CryptoKey) ---
export const hashFileToKey = async (fileData: Uint8Array): Promise<CryptoKey> => {
    const hash = await crypto.subtle.digest('SHA-256', fileData as any);
    return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

// --- Helper: Encrypt Share with Key File ---
export const encryptShare = async (share: string, keyFile: Uint8Array): Promise<Uint8Array> => {
    const key = await hashFileToKey(keyFile);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const data = enc.encode(share);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return concatBuffers([iv, new Uint8Array(ciphertext)]);
};

// --- Helper: Decrypt Share with Key File ---
export const decryptShare = async (encShare: Uint8Array, keyFile: Uint8Array): Promise<string | null> => {
    try {
        const key = await hashFileToKey(keyFile);
        const iv = encShare.slice(0, 12);
        const data = encShare.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
};

// --- Helper: Derive Key (PBKDF2) ---
// Updated to support raw secret mixing
const deriveKey = async (password: string, salt: Uint8Array, usage: KeyUsage[], keyFile?: Uint8Array, secret?: string, iterations: number = 600000): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  let keyMaterialParts: Uint8Array[] = [];

  // 1. Password
  if (password) {
      keyMaterialParts.push(await sha256(enc.encode(password)));
  }

  // 2. Legacy Single Key File
  if (keyFile && keyFile.length > 0) {
    keyMaterialParts.push(await sha256(keyFile));
  }

  // 3. Multi-Key Secret
  if (secret) {
      keyMaterialParts.push(await sha256(enc.encode(secret)));
  }

  // If nothing provided, this is insecure, but we shouldn't reach here if validated.
  // Fallback to empty password if absolutely nothing (should be prevented by UI)
  if (keyMaterialParts.length === 0) {
      keyMaterialParts.push(await sha256(enc.encode(''))); 
  }

  const keyMaterialData = concatBuffers(keyMaterialParts);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    keyMaterialData as any,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
};

// --- 1. Pack / Unpack Files ---

export const packFiles = async (files: File[], compress: boolean = false): Promise<Uint8Array> => {
  const fileBuffers: Uint8Array[] = [];
  const metadata: FileMetadata[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    fileBuffers.push(buffer);
    metadata.push({
      name: file.name,
      type: file.type,
      size: buffer.length,
      offset: currentOffset
    });
    currentOffset += buffer.length;
  }

  const combinedData = concatBuffers(fileBuffers);
  let payload = combinedData;
  let isCompressed = false;

  if (compress) {
    try {
        payload = pako.gzip(combinedData);
        isCompressed = true;
    } catch (e) {
        console.warn("Compression failed, falling back to uncompressed", e);
    }
  }

  const header: PackageHeader = {
    version: 1,
    files: metadata,
    totalSize: currentOffset, // Original size for reference
    compression: isCompressed ? 'gzip' : 'none'
  };

  const headerString = JSON.stringify(header);
  const headerBuffer = new TextEncoder().encode(headerString);
  
  // Format: [Header Length (4 bytes, UI32LE)] + [Header JSON] + [Payload (Compressed or Raw)]
  const lengthBuffer = new Uint8Array(4);
  new DataView(lengthBuffer.buffer).setUint32(0, headerBuffer.length, true); // Little Endian

  return concatBuffers([lengthBuffer, headerBuffer, payload]);
};

export const unpackFiles = async (data: Uint8Array): Promise<File[]> => {
  if (data.length < 4) throw new Error('Invalid data: Too short');

  const headerLength = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0, true);
  
  if (data.length < 4 + headerLength) throw new Error('Invalid data: Header incomplete');

  const headerBuffer = data.slice(4, 4 + headerLength);
  const headerString = new TextDecoder().decode(headerBuffer);
  
  let header: PackageHeader;
  try {
    header = JSON.parse(headerString);
  } catch (e) {
    throw new Error('Invalid data: Header corrupted');
  }

  if (header.version !== 1) throw new Error(`Unsupported version: ${header.version}`);

  const filesDataStart = 4 + headerLength;
  
  let payload = data.slice(filesDataStart);

  // Decompress if needed
  if (header.compression === 'gzip') {
      try {
          payload = pako.ungzip(payload);
      } catch (e) {
          throw new Error('Decompression failed: Data corrupted or wrong format');
      }
  }

  const files: File[] = [];

  for (const meta of header.files) {
    // Note: meta.offset is relative to the UNCOMPRESSED payload
    const start = meta.offset; 
    const end = start + meta.size;
    
    if (end > payload.length) throw new Error(`File data incomplete for ${meta.name}`);
    
    const fileData = payload.slice(start, end);
    files.push(new File([fileData], meta.name, { type: meta.type }));
  }

  return files;
};

// --- 2. Encrypt / Decrypt ---

const MAGIC_SAFE = new Uint8Array([0x53, 0x41, 0x46, 0x45]); // "SAFE"
const VERSION_SAFE = 2;
const VERSION_SAFE_V3 = 3;
const DEFAULT_ITERATIONS = 600000;
const LEGACY_ITERATIONS = 100000;

export const encryptBinary = async (data: Uint8Array, password: string, keyFile?: Uint8Array, iterations: number = DEFAULT_ITERATIONS, secret?: string, metadata?: any): Promise<Uint8Array> => {
  // Try WASM first (Only for V2/Legacy, no secret/metadata support in WASM yet)
  const wasm = wasmManager.getExports();
  if (wasm && !secret && !metadata) {
    try {
      return wasm.encrypt_binary_wasm(data, password, keyFile, iterations);
    } catch (e) {
      console.warn('WASM encryption failed, falling back to JS:', e);
    }
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 1. Derive Key
  const key = await deriveKey(password, salt, ['encrypt'], keyFile, secret, iterations);

  // 2. Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    data as any
  );

  // 3. Pack
  // Header Base: MAGIC(4) + Ver(1) + Iterations(4) + Salt(16) + IV(12) = 37 bytes
  
  const headerBase = new Uint8Array(37);
  headerBase.set(MAGIC_SAFE, 0);
  
  // Choose Version
  const version = metadata ? VERSION_SAFE_V3 : VERSION_SAFE;
  headerBase[4] = version;
  
  new DataView(headerBase.buffer).setUint32(5, iterations, true); // Little Endian
  headerBase.set(salt, 9);
  headerBase.set(iv, 25);

  const parts = [headerBase];

  // Append Metadata for V3
  if (version === VERSION_SAFE_V3 && metadata) {
      const metaStr = JSON.stringify(metadata);
      const metaBytes = new TextEncoder().encode(metaStr);
      const metaLen = new Uint8Array(4);
      new DataView(metaLen.buffer).setUint32(0, metaBytes.length, true);
      parts.push(metaLen);
      parts.push(metaBytes);
  }

  parts.push(new Uint8Array(encrypted));

  return concatBuffers(parts);
};

export const extractMetadata = (encryptedData: Uint8Array): any | null => {
    if (encryptedData.length < 37) return null;
    
    // Check Magic
    if (encryptedData[0] !== MAGIC_SAFE[0] || encryptedData[1] !== MAGIC_SAFE[1] || 
        encryptedData[2] !== MAGIC_SAFE[2] || encryptedData[3] !== MAGIC_SAFE[3]) {
        return null;
    }

    const version = encryptedData[4];
    if (version === VERSION_SAFE_V3) {
        try {
            const metaLen = new DataView(encryptedData.buffer, encryptedData.byteOffset, encryptedData.byteLength).getUint32(37, true);
            if (encryptedData.length < 37 + 4 + metaLen) return null;
            
            const metaBytes = encryptedData.slice(41, 41 + metaLen);
            const metaStr = new TextDecoder().decode(metaBytes);
            return JSON.parse(metaStr);
        } catch (e) {
            console.warn("Failed to parse metadata", e);
            return null;
        }
    }
    return null;
};

export const decryptBinary = async (encryptedData: Uint8Array, password: string, keyFile?: Uint8Array, secret?: string): Promise<Uint8Array> => {
  if (encryptedData.length < 28) throw new Error('Data too short');

  // Try WASM first (Only if no secret is involved, and looks like V2)
  // Actually, we can't easily know if WASM supports V3 without checking version.
  // Assuming WASM is old.
  const wasm = wasmManager.getExports();
  if (wasm && !secret) {
     // Check version to ensure we don't send V3 to WASM
     if (encryptedData.length >= 5 && encryptedData[4] !== VERSION_SAFE_V3) {
        try {
          return wasm.decrypt_binary_wasm(encryptedData, password, keyFile);
        } catch (e) {
          console.warn('WASM decryption failed, falling back to JS:', e);
        }
     }
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  let iterations = LEGACY_ITERATIONS;

  // Check for SAFE Magic Header
  let isSafeFormat = false;
  if (encryptedData.length >= 37) {
    const magic = encryptedData.slice(0, 4);
    if (magic[0] === MAGIC_SAFE[0] && magic[1] === MAGIC_SAFE[1] && magic[2] === MAGIC_SAFE[2] && magic[3] === MAGIC_SAFE[3]) {
      isSafeFormat = true;
    }
  }

  if (isSafeFormat) {
    // New Format: MAGIC(4) + Ver(1) + Iterations(4) + Salt(16) + IV(12) + [MetaLen(4) + Meta]? + Data
    const version = encryptedData[4];
    
    iterations = new DataView(encryptedData.buffer, encryptedData.byteOffset, encryptedData.byteLength).getUint32(5, true);
    salt = encryptedData.slice(9, 25);
    iv = encryptedData.slice(25, 37);
    
    let dataStart = 37;
    
    if (version === VERSION_SAFE_V3) {
        const metaLen = new DataView(encryptedData.buffer, encryptedData.byteOffset, encryptedData.byteLength).getUint32(37, true);
        dataStart = 41 + metaLen;
    } else if (version !== VERSION_SAFE) {
        throw new Error(`Unsupported encryption version: ${version}`);
    }
    
    ciphertext = encryptedData.slice(dataStart);
  } else {
    // Legacy Format: Salt(16) + IV(12) + Data
    salt = encryptedData.slice(0, 16);
    iv = encryptedData.slice(16, 28);
    ciphertext = encryptedData.slice(28);
  }

  // 1. Derive Key
  const key = await deriveKey(password, salt, ['decrypt'], keyFile, secret, iterations);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertext as any
    );
    return new Uint8Array(decrypted);
  } catch (e) {
    throw new Error('Decryption failed: Wrong password, missing Key File, or corrupted data');
  }
};

// --- 3. Sharding (N-of-N Simple Splitting) ---

// Header for each shard: [ShardIndex (1 byte)] + [TotalShards (1 byte)] + [Data...]
// Filename convention: filename.part1.enc, filename.part2.enc ...

export const shardBinary = (data: Uint8Array, n: number): Uint8Array[] => {
  if (n < 1 || n > 255) throw new Error('Shards must be between 1 and 255');
  
  const totalLen = data.length;
  const chunkSize = Math.ceil(totalLen / n);
  const shards: Uint8Array[] = [];

  for (let i = 0; i < n; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalLen);
    const chunk = data.slice(start, end);
    
    // Add simple header
    const header = new Uint8Array([i + 1, n]); // 1-based index, Total
    shards.push(concatBuffers([header, chunk]));
  }

  return shards;
};

export const mergeShards = (shards: Uint8Array[]): Uint8Array => {
  if (shards.length === 0) throw new Error('No shards provided');

  // Parse headers
  const parsed = shards.map(shard => {
    if (shard.length < 2) throw new Error('Invalid shard: Too short');
    const index = shard[0];
    const total = shard[1];
    const data = shard.slice(2);
    return { index, total, data };
  });

  // Validation
  const totalShards = parsed[0].total;
  if (parsed.some(p => p.total !== totalShards)) throw new Error('Shards mismatch: Total count differs');
  if (parsed.length !== totalShards) throw new Error(`Missing shards: Expected ${totalShards}, got ${parsed.length}`);
  
  // Sort by index
  parsed.sort((a, b) => a.index - b.index);

  // Check sequence
  for (let i = 0; i < totalShards; i++) {
    if (parsed[i].index !== i + 1) throw new Error('Missing or duplicate shard index');
  }

  // Merge
  return concatBuffers(parsed.map(p => p.data));
};
