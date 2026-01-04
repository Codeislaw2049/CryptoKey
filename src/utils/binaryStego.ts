
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
  throw new Error("Image Steganography is a PRO feature. Please upgrade to use this functionality.");
};

export const extractBinary = (imageData: ImageData): Uint8Array | null => {
  throw new Error("Image Steganography is a PRO feature. Please upgrade to use this functionality.");
};
