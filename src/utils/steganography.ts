
import { wasmManager } from '../wasm/wasmLoader';

// Utility for LSB Steganography

export const stringToBinary = (str: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += bytes[i].toString(2).padStart(8, '0');
  }
  return binary;
};

export const binaryToString = (binary: string): string => {
  const bytes = new Uint8Array(binary.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const byte = binary.slice(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byte, 2);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

export const embedDataJS = (imageData: ImageData, message: string): ImageData => {
  const binaryMessage = stringToBinary(message);
  
  // Magic Signature "STEG" (0x53544547) -> 01010011 01010100 01000101 01000111
  const magicBinary = "01010011010101000100010101000111";
  
  // 32 bits for length header
  const lengthBinary = binaryMessage.length.toString(2).padStart(32, '0');
  
  const fullBinary = magicBinary + lengthBinary + binaryMessage;

  const data = imageData.data;
  const capacity = data.length * 0.75; // 3 channels (RGB) per pixel, Alpha is skipped

  if (fullBinary.length > capacity) {
    throw new Error(`Message too large. Need ${fullBinary.length} bits, but image can only hold ${capacity} bits.`);
  }

  let bitIndex = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Force Alpha to 255 to prevent browser compression/premultiplication artifacts
    data[i + 3] = 255;

    // Modify R, G, B channels
    for (let j = 0; j < 3; j++) {
      if (bitIndex < fullBinary.length) {
        // Clear LSB and set it to message bit
        data[i + j] = (data[i + j] & 0xFE) | parseInt(fullBinary[bitIndex], 10);
        bitIndex++;
      } else {
        // Optional: clear remaining bits to 0 to reduce noise? 
        // No, keep original image noise to be stealthy.
        break;
      }
    }
    if (bitIndex >= fullBinary.length) break;
  }

  return imageData;
};

// Embeds message into image data using LSB
export const embedData = (imageData: ImageData, message: string): ImageData => {
  const exports = wasmManager.getExports();
  if (exports) {
    try {
      console.log("Using Wasm for Embed");
      const resultVec = exports.embed_stego(new Uint8Array(imageData.data), message);
      const newClamped = new Uint8ClampedArray(resultVec);
      return new ImageData(newClamped, imageData.width, imageData.height);
    } catch (e) {
      console.warn("Wasm Embed failed, falling back to JS", e);
    }
  }
  return embedDataJS(imageData, message);
};

// Extracts message from image data using LSB
export const extractData = (imageData: ImageData): string | null => {
  const data = imageData.data;
  
  // 1. Extract Magic (32 bits) + Length (32 bits) = 64 bits
  let headerBits = '';
  
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
        if (headerBits.length < 64) {
            headerBits += (data[i + j] & 1).toString();
        } else {
            break;
        }
    }
    if (headerBits.length >= 64) break;
  }

  const magicBits = headerBits.slice(0, 32);
  const lengthBits = headerBits.slice(32, 64);
  
  // Check Magic "STEG"
  // "01010011010101000100010101000111"
  if (magicBits !== "01010011010101000100010101000111") {
      return null; // Not a stego image
  }

  const messageLength = parseInt(lengthBits, 2);
  if (isNaN(messageLength) || messageLength <= 0 || messageLength > data.length * 3) {
      return null; // Invalid length
  }

  // 2. Extract Body
  let messageBits = '';
  let totalBitsNeeded = 64 + messageLength; // Offset by 64 bits
  let currentBit = 0;

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
        if (currentBit >= 64 && currentBit < totalBitsNeeded) {
             messageBits += (data[i + j] & 1).toString();
        }
        currentBit++;
        if (currentBit >= totalBitsNeeded) break;
    }
    if (currentBit >= totalBitsNeeded) break;
  }

  try {
      return binaryToString(messageBits);
  } catch (e) {
      console.error("Failed to decode binary string", e);
      return null;
  }
};
