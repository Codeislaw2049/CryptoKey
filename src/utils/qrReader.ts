import jsQR from 'jsqr';
import QRWorker from '../workers/qrScanner.worker?worker';

/**
 * Binarizes image data using a simple threshold
 */
const binarize = (imageData: ImageData, threshold: number = 128): ImageData => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // Simple grayscale (rec601 luma)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = gray < threshold ? 0 : 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
    }
    return imageData;
};

/**
 * Inverts colors (White on Black -> Black on White)
 */
const invertColors = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
    }
    return imageData;
};

/**
 * Increases contrast of image data
 * contrast value: -100 to 100
 */
const applyContrast = (imageData: ImageData, contrast: number): ImageData => {
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;     // R
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
    }
    return imageData;
};

interface ScanOptions {
  scale?: number;
  smoothing?: boolean;
  contrast?: number;
  binarize?: boolean;
  binarizeThreshold?: number;
  invert?: boolean;
  crop?: boolean; // Center crop 80%
  padding?: boolean; // Add 10% white border
  rotation?: number; // 0, 90, 180, 270
}

/**
 * Fallback implementation running on the main thread.
 * Used when Web Workers or OffscreenCanvas are not supported.
 */
const readQrFromFileMainThread = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Strategy Executor
        const attemptScan = (opts: ScanOptions): string | null => {
          const scale = opts.scale ?? 1;
          const rotation = opts.rotation ?? 0;
          
          // Calculate dimensions based on rotation
          let w, h;
          if (rotation === 90 || rotation === 270) {
             w = Math.floor(img.height * scale);
             h = Math.floor(img.width * scale);
          } else {
             w = Math.floor(img.width * scale);
             h = Math.floor(img.height * scale);
          }

          // Add padding if requested
          let paddingX = 0, paddingY = 0;
          if (opts.padding) {
             paddingX = Math.floor(w * 0.1);
             paddingY = Math.floor(h * 0.1);
             w += paddingX * 2;
             h += paddingY * 2;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;

          ctx.imageSmoothingEnabled = opts.smoothing ?? false;
          
          // Fill background white
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);

          ctx.save();
          
          // Handle rotation and drawing
          ctx.translate(w/2, h/2);
          ctx.rotate((rotation * Math.PI) / 180);
          
          const drawW = (rotation === 90 || rotation === 270) ? h : w;
          const drawH = (rotation === 90 || rotation === 270) ? w : h;
          
          // Adjust for padding (we are at center now)
          const effW = drawW - (opts.padding ? paddingX * 2 : 0);
          const effH = drawH - (opts.padding ? paddingY * 2 : 0);
          
          if (opts.crop) {
             // Draw only center 80% of SOURCE image
             const sx = img.width * 0.1;
             const sy = img.height * 0.1;
             const sw = img.width * 0.8;
             const sh = img.height * 0.8;
             // Draw to full destination
             ctx.drawImage(img, sx, sy, sw, sh, -effW/2, -effH/2, effW, effH);
          } else {
             ctx.drawImage(img, -effW/2, -effH/2, effW, effH);
          }
          
          ctx.restore();

          try {
            let imageData = ctx.getImageData(0, 0, w, h);
            
            // Apply contrast
            if (opts.contrast) {
               imageData = applyContrast(imageData, opts.contrast);
            }

            // Apply Invert
            if (opts.invert) {
               imageData = invertColors(imageData);
            }

            // Apply binarization
            if (opts.binarize) {
               imageData = binarize(imageData, opts.binarizeThreshold ?? 128);
            }

            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                console.log(`[QR Success MainThread] Strategy:`, opts);
            }
            return code ? code.data : null;
          } catch (err) {
            console.warn('QR scan error:', err);
            return null;
          }
        };

        // --- RETRY STRATEGIES (Ordered by speed/likelihood) ---
        
        const strategies: ScanOptions[] = [
            // 1. Standard
            { scale: 1, smoothing: false },
            // 2. Smoothed
            { scale: 1, smoothing: true },
            // 3. Upscaled 1.5x
            { scale: 1.5, smoothing: false },
            // 4. Downscaled 0.8x (Good for blurry images)
            { scale: 0.8, smoothing: false },
            // 5. High Contrast
            { scale: 1, contrast: 20 },
            // 6. Binarized
            { scale: 1, binarize: true },
            // 7. Upscale 2.0x
            { scale: 2.0, smoothing: false },
            // 8. Upscale 2.0x + Binarize
            { scale: 2.0, binarize: true },
            // 9. Extra High Contrast
            { scale: 1, contrast: 50 },
            // 10. Upscale 3.0x (Dense codes)
            { scale: 3.0, smoothing: false },
            // 11. Inverted
            { scale: 1, invert: true },
            // 12. Center Crop (Focus on content)
            { scale: 1, crop: true },
            // 13. Padding (Fix edge issues)
            { scale: 1, padding: true },
            // 14. Rotations
            { scale: 1, rotation: 90 },
            { scale: 1, rotation: 180 },
            { scale: 1, rotation: 270 },
            // 15. Darker Binarization
            { scale: 1, binarize: true, binarizeThreshold: 100 },
            // 16. Lighter Binarization
            { scale: 1, binarize: true, binarizeThreshold: 160 },
            // 17. Extreme Upscale + Padding
            { scale: 2.0, padding: true, binarize: true },
            // 18. Low Threshold Binarization (Darker)
            { scale: 1, binarize: true, binarizeThreshold: 80 },
            // 19. High Threshold Binarization (Lighter)
            { scale: 1, binarize: true, binarizeThreshold: 200 },
            // 20. Super Upscale (Very Dense)
            { scale: 4.0, smoothing: false },
            // 21. High Contrast + Binarize
            { scale: 1, contrast: 60, binarize: true },
            // 22. Downscale + Binarize (Blurry)
            { scale: 0.5, binarize: true }
        ];

        // Execute sequentially
        for (const strategy of strategies) {
            const result = attemptScan(strategy);
            if (result) return resolve(result);
        }

        console.warn(`[QR Failure] Failed all ${strategies.length} strategies for file: ${file.name}`);
        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Robustly reads a QR code from a File object using multiple scanning strategies.
 * This handles high-density (Version 40) QR codes that often fail with default canvas settings.
 * Uses Web Worker and OffscreenCanvas if available to prevent UI blocking.
 */
export const readQrFromFile = async (file: File): Promise<string | null> => {
    // Check for Worker and OffscreenCanvas support
    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
        try {
            // Create bitmap on main thread
            const bitmap = await createImageBitmap(file);
            
            return new Promise((resolve) => {
                const worker = new QRWorker();
                
                worker.onmessage = (e) => {
                    resolve(e.data.result);
                    worker.terminate();
                };
                
                worker.onerror = (e) => {
                    console.error('QR Worker Error, falling back to main thread:', e);
                    worker.terminate();
                    // Fallback to main thread
                    readQrFromFileMainThread(file).then(resolve);
                };
                
                // Transfer the bitmap to the worker
                worker.postMessage({ bitmap }, [bitmap]);
            });
        } catch (e) {
            console.warn('Worker init or createImageBitmap failed, falling back:', e);
            return readQrFromFileMainThread(file);
        }
    }
    
    // Fallback
    return readQrFromFileMainThread(file);
};
