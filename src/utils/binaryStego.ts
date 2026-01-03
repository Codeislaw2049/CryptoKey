
/**
 * Binary LSB Steganography Utilities
 * Optimized for hiding binary files (Uint8Array) directly into ImageData
 */

import { wasmManager } from '../wasm/wasmLoader';

const MAGIC_SIGNATURE = [0x49, 0x4D, 0x47, 0x56]; // "IMGV" (Image Vault)

export const getCapacity = (width: number, height: number): number => {
  // 3 channels (RGB) per pixel, 1 bit per channel
  // Returns capacity in Bytes
  const totalBits = width * height * 3;
  return Math.floor(totalBits / 8) - 8; // Subtract 8 bytes for header (4 Magic + 4 Length)
};

export const embedBinary = (imageData: ImageData, payload: Uint8Array): ImageData => {
  const { width, height, data } = imageData;

  // Try WASM first
  const wasm = wasmManager.getExports();
  if (wasm) {
    try {
      const resultData = wasm.embed_binary_wasm(data, payload);
      // Create new ImageData with result
      return new ImageData(new Uint8ClampedArray(resultData), width, height);
    } catch (e) {
       console.warn('WASM embed failed, falling back to JS:', e);
    }
  }

  const totalPixels = width * height;
  const capacity = getCapacity(width, height);

  if (payload.length > capacity) {
    throw new Error(`Payload too large. Image capacity: ${(capacity / 1024).toFixed(2)} KB, Payload: ${(payload.length / 1024).toFixed(2)} KB`);
  }

  // Prepare Header: Magic (4) + Length (4)
  const header = new Uint8Array(8);
  header.set(MAGIC_SIGNATURE, 0);
  new DataView(header.buffer).setUint32(4, payload.length, true); // Little Endian length

  // Full data stream to embed
  // Note: We process this stream byte by byte to avoid creating a massive bit string
  
  let byteIndex = 0; // Index in header+payload
  let bitIndex = 0;  // 0-7
  let currentByte = header[0];
  
  // Total bytes to write = 8 (header) + payload.length
  const totalBytes = 8 + payload.length;

  for (let i = 0; i < totalPixels; i++) {
    const pixelOffset = i * 4;
    
    // Set Alpha to 255 (fully opaque)
    data[pixelOffset + 3] = 255;

    // Iterate RGB channels
    for (let j = 0; j < 3; j++) {
      if (byteIndex >= totalBytes) break;

      // Get current bit from currentByte
      // bitIndex 0 is MSB? LSB?
      // Let's use standard: bit 0 is LSB (1), bit 7 is MSB (128)
      // Actually, reading order matters. Let's write from LSB to MSB or MSB to LSB.
      // Let's use MSB first (bit 7 down to 0) for readability in hex, but LSB first is common too.
      // Let's stick to: Bit 7 (128) -> Bit 0 (1)
      const bit = (currentByte >> (7 - bitIndex)) & 1;
      
      // Embed into channel LSB
      data[pixelOffset + j] = (data[pixelOffset + j] & 0xFE) | bit;

      bitIndex++;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex++;
        if (byteIndex < totalBytes) {
           if (byteIndex < 8) {
             currentByte = header[byteIndex];
           } else {
             currentByte = payload[byteIndex - 8];
           }
        }
      }
    }
    if (byteIndex >= totalBytes && bitIndex === 0) break;
  }

  return imageData;
};

export const extractBinary = (imageData: ImageData): Uint8Array | null => {
  const { width, height, data } = imageData;

  // Try WASM first
  const wasm = wasmManager.getExports();
  if (wasm) {
    try {
      return wasm.extract_binary_wasm(data);
    } catch (e) {
      console.warn('WASM extract failed, falling back to JS:', e);
    }
  }
  
  const totalPixels = width * height;
  
  let byteIndex = 0;
  let bitIndex = 0;
  let currentByte = 0;
  
  // Phase 1: Read Header (8 bytes)
  const headerBytes = new Uint8Array(8);
  let payloadBytes: Uint8Array | null = null;
  let payloadLength = 0;
  let readingHeader = true;

  for (let i = 0; i < totalPixels; i++) {
    const pixelOffset = i * 4;

    for (let j = 0; j < 3; j++) {
      // Extract LSB
      const bit = data[pixelOffset + j] & 1;
      
      // Accumulate bit (MSB first)
      currentByte = (currentByte << 1) | bit;
      bitIndex++;

      if (bitIndex === 8) {
        if (readingHeader) {
          headerBytes[byteIndex] = currentByte;
          byteIndex++;
          
          if (byteIndex === 8) {
             // Validate Magic
             for(let k=0; k<4; k++) {
               if (headerBytes[k] !== MAGIC_SIGNATURE[k]) return null; // Not an ImageVault image
             }
             
             // Get Length
             payloadLength = new DataView(headerBytes.buffer).getUint32(4, true);
             
             // Check reasonable length
             const maxCap = getCapacity(width, height);
             if (payloadLength > maxCap || payloadLength < 0) return null;

             // Initialize Payload Buffer
             payloadBytes = new Uint8Array(payloadLength);
             readingHeader = false;
             byteIndex = 0; // Reset for payload
          }
        } else {
          // Reading Payload
          if (payloadBytes && byteIndex < payloadLength) {
            payloadBytes[byteIndex] = currentByte;
            byteIndex++;
            if (byteIndex === payloadLength) {
              return payloadBytes; // Done
            }
          }
        }
        
        // Reset for next byte
        currentByte = 0;
        bitIndex = 0;
      }
    }
    if (!readingHeader && payloadBytes && byteIndex === payloadLength) break;
  }

  return payloadBytes; // Might be incomplete if image cropped, but we return what we have? No, return null if incomplete.
};
