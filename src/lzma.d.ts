declare module 'lzma' {
    export function compress(data: string | Uint8Array, mode: number, callback: (result: number[], error: Error | null) => void): void;
    export function decompress(data: Uint8Array, callback: (result: string | number[], error: Error | null) => void): void;
}
