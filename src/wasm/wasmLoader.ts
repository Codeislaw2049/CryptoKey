import { ProWasmExports } from './types';

// Singleton to manage Wasm instance
class WasmManager {
  private static instance: WasmManager;
  private exports: ProWasmExports | null = null;
  private isLoading = false;

  private constructor() {}

  public static getInstance(): WasmManager {
    if (!WasmManager.instance) {
      WasmManager.instance = new WasmManager();
    }
    return WasmManager.instance;
  }

  public async loadProModule(): Promise<boolean> {
    if (this.exports) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    try {
      console.log("Initializing Wasm Plugin Architecture...");
      
      // Dynamic import of the generated Wasm glue code
      // @ts-ignore - The pkg directory is generated at build time
      const wasm = await import('./pkg/wasm_pro');
      
      // Initialize the Wasm module
      await wasm.default();
      
      this.exports = {
        encrypt_binary_wasm: wasm.encrypt_binary_wasm,
        decrypt_binary_wasm: wasm.decrypt_binary_wasm,
        embed_binary_wasm: wasm.embed_binary_wasm,
        extract_binary_wasm: wasm.extract_binary_wasm,
        verify_license_wasm: wasm.verify_license_wasm,
        create_video_trailer_wasm: wasm.create_video_trailer_wasm,
        parse_video_trailer_wasm: wasm.parse_video_trailer_wasm,
        memory: (wasm as any).memory
      };

      console.log("Wasm Module Loaded Successfully!");
      return true;

    } catch (error) {
      console.error("Failed to load Pro Wasm Module:", error);
      console.warn("Falling back to JS implementation (if available)");
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  public getExports(): ProWasmExports | null {
    return this.exports;
  }

  public isReady(): boolean {
    return !!this.exports;
  }
}

export const wasmManager = WasmManager.getInstance();
