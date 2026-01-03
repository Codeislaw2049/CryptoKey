
import { wasmManager } from '../wasm/wasmLoader';

const MAGIC_SIGNATURE = 'CKVIDEOVAULT'; // 12 chars
const TRAILER_SIZE = 20; // 12 (Sig) + 8 (Length)

export const embedInVideo = async (videoFile: File, payload: Uint8Array): Promise<Blob> => {
  const videoBuffer = await videoFile.arrayBuffer();
  const payloadLength = payload.length;

  // Try WASM for trailer generation
  const wasm = wasmManager.getExports();
  if (wasm) {
     try {
       const trailer = wasm.create_video_trailer_wasm(payloadLength);
       return new Blob([videoBuffer, payload, trailer] as BlobPart[], { type: videoFile.type });
     } catch (e) {
       console.warn('WASM trailer generation failed, falling back to JS:', e);
     }
  }

  // Fallback JS
  const signatureBuffer = new TextEncoder().encode(MAGIC_SIGNATURE);
  const lengthBuffer = new Uint8Array(8);
  new DataView(lengthBuffer.buffer).setBigUint64(0, BigInt(payloadLength), true); // Little Endian

  return new Blob([videoBuffer, payload, signatureBuffer, lengthBuffer] as BlobPart[], { type: videoFile.type });
};

export const extractFromVideo = async (videoFile: File): Promise<Uint8Array> => {
  // Read last 20 bytes
  const fileSize = videoFile.size;
  if (fileSize < TRAILER_SIZE) {
    throw new Error('File too small to contain hidden data');
  }

  const trailerSlice = videoFile.slice(fileSize - TRAILER_SIZE, fileSize);
  const trailerBuffer = await trailerSlice.arrayBuffer();
  const trailerData = new Uint8Array(trailerBuffer);
  
  let payloadLength: number;

  // Try WASM
  const wasm = wasmManager.getExports();
  if (wasm) {
    try {
      payloadLength = wasm.parse_video_trailer_wasm(trailerData);
    } catch (e) {
      console.warn('WASM trailer parse failed, falling back to JS:', e);
      payloadLength = fallbackParse(trailerData);
    }
  } else {
      payloadLength = fallbackParse(trailerData);
  }
  
  if (payloadLength <= 0 || payloadLength > fileSize - TRAILER_SIZE) {
    throw new Error('Invalid payload length detected');
  }

  // Extract Payload
  // Start = Total - Trailer - Payload
  const start = fileSize - TRAILER_SIZE - payloadLength;
  const payloadSlice = videoFile.slice(start, start + payloadLength);
  
  return new Uint8Array(await payloadSlice.arrayBuffer());
};

function fallbackParse(trailerData: Uint8Array): number {
    const signatureBuffer = trailerData.slice(0, 12);
    const lengthBuffer = trailerData.slice(12, 20);

    const signature = new TextDecoder().decode(signatureBuffer);
    
    if (signature !== MAGIC_SIGNATURE) {
      throw new Error('No hidden data found (Signature mismatch)');
    }
  
    return Number(new DataView(lengthBuffer.buffer).getBigUint64(0, true));
}
