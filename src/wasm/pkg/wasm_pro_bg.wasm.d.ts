/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const combine_shares_wasm: (a: any) => [number, number, number, number];
export const split_secret_wasm: (a: number, b: number, c: number, d: number) => [number, number, number];
export const create_video_trailer_wasm: (a: number) => any;
export const parse_video_trailer_wasm: (a: number, b: number) => [number, number, number];
export const verify_license_wasm: (a: number, b: number, c: number, d: number) => number;
export const decrypt_binary_wasm: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const encrypt_binary_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
export const embed_binary_wasm: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const extract_binary_wasm: (a: number, b: number) => [number, number, number, number];
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
