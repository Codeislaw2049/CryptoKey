export interface ProWasmExports {
  encrypt_binary_wasm: (data: Uint8Array, password: string, key_file: Uint8Array | undefined | null, iterations: number | undefined | null) => Uint8Array;
  decrypt_binary_wasm: (data: Uint8Array, password: string, key_file: Uint8Array | undefined | null) => Uint8Array;
  embed_binary_wasm: (image_data: Uint8ClampedArray, payload: Uint8Array) => Uint8ClampedArray;
  extract_binary_wasm: (image_data: Uint8ClampedArray) => Uint8Array;
  verify_license_wasm: (content_json: string, signature_hex: string) => boolean;
  create_video_trailer_wasm: (payload_length: number) => Uint8Array;
  parse_video_trailer_wasm: (trailer_data: Uint8Array) => number;
  split_secret_wasm: (secret: string, shares_count: number, threshold: number) => any;
  combine_shares_wasm: (shares: any) => string;
  memory: WebAssembly.Memory;
}

export interface WasmModuleResult<T> {
  exports: T;
}
