/* tslint:disable */
/* eslint-disable */

export function combine_shares_wasm(shares: any): string;

export function create_video_trailer_wasm(payload_length: number): Uint8Array;

export function decrypt_binary_wasm(encrypted_data: Uint8Array, password: string, key_file?: Uint8Array | null): Uint8Array;

export function embed_binary_wasm(image_data: Uint8ClampedArray, payload: Uint8Array): Uint8ClampedArray;

export function encrypt_binary_wasm(data: Uint8Array, password: string, key_file?: Uint8Array | null, iterations?: number | null): Uint8Array;

export function extract_binary_wasm(image_data: Uint8ClampedArray): Uint8Array;

export function parse_video_trailer_wasm(trailer_data: Uint8Array): number;

export function split_secret_wasm(secret: string, shares_count: number, threshold: number): any;

export function verify_license_wasm(content_json: string, signature_hex: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly combine_shares_wasm: (a: any) => [number, number, number, number];
  readonly split_secret_wasm: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly create_video_trailer_wasm: (a: number) => any;
  readonly parse_video_trailer_wasm: (a: number, b: number) => [number, number, number];
  readonly verify_license_wasm: (a: number, b: number, c: number, d: number) => number;
  readonly decrypt_binary_wasm: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly encrypt_binary_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
  readonly embed_binary_wasm: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly extract_binary_wasm: (a: number, b: number) => [number, number, number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
