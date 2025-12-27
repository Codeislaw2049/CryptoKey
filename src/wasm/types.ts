export interface ProWasmExports {
  check_license: (key: string) => boolean;
  verify_offline_license: (json: string) => boolean;
  split_secret: (secret: string, shares_count: number, threshold: number) => string[];
  combine_shares: (shares: string[]) => string;
  embed_stego: (image_data: Uint8Array, message: string) => Uint8Array;
  memory: WebAssembly.Memory;
}

export interface WasmModuleResult<T> {
  exports: T;
  // We might not get raw instance/module easily via wasm-bindgen imports, 
  // so we relax this or remove if not needed.
  // instance: WebAssembly.Instance; 
  // module: WebAssembly.Module;
}
