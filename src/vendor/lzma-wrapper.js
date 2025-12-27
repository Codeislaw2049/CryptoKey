import LZMA from './lzma_worker_impl.js';

export const compress = LZMA.compress;
export const decompress = LZMA.decompress;
export const LZMA_WORKER = LZMA;
export default LZMA;
