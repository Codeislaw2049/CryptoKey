import * as bip39 from 'bip39';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';

// Ensure Buffer is available
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

export const validateMnemonic = (mnemonic: string): { isValid: boolean; error?: string } => {
  const words = mnemonic.trim().split(/\s+/);
  
  // 1. Check word count
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return { isValid: false, error: `Invalid word count (${words.length}). Expected 12, 15, 18, 21, or 24.` };
  }

  // 2. Check invalid words
  const wordlist = bip39.wordlists.english;
  const invalidWords = words.filter(word => !wordlist.includes(word));
  if (invalidWords.length > 0) {
    return { isValid: false, error: `Invalid words found: ${invalidWords.join(', ')}` };
  }

  // 3. Check checksum
  if (!bip39.validateMnemonic(mnemonic)) {
    return { isValid: false, error: 'Invalid Checksum. Please check word order or if a word was replaced.' };
  }

  return { isValid: true };
};

/**
 * Generates cryptographically secure entropy using the Web Crypto API.
 * @param strength Bits of entropy (128 or 256). Default 128.
 */
export const generateEntropy = (strength: 128 | 256 = 128): string => {
  const bytes = strength / 8;
  const array = new Uint8Array(bytes);
  window.crypto.getRandomValues(array);
  return Buffer.from(array).toString('hex');
};

/**
 * Generates a BIP39 mnemonic from secure entropy.
 * @param strength Bits of entropy (128 or 256). Default 128.
 */
export const generateMnemonic = (strength: 128 | 256 = 128): string => {
  const entropyHex = generateEntropy(strength);
  return bip39.entropyToMnemonic(entropyHex);
};

/**
 * Derives an Ethereum address from a mnemonic using standard BIP44 path.
 * Path: m/44'/60'/0'/0/{index}
 */
export const deriveEthAddress = (mnemonic: string, index: number = 0): string => {
  // Use ethers.js for standard compliance
  // HDNodeWallet.fromPhrase handles BIP39 + BIP32 + Address generation
  // ethers v6
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
  return wallet.address;
};

export const getWalletDetails = (mnemonic: string, index: number = 0) => {
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    path: wallet.path
  };
};

export const mnemonicToIndices = (mnemonic: string): number[] => {
  const words = mnemonic.trim().split(/\s+/);
  const wordlist = bip39.wordlists.english;
  return words.map(word => {
    const index = wordlist.indexOf(word);
    if (index === -1) throw new Error(`Invalid word: ${word}`);
    return index;
  });
};

/**
 * Converts arbitrary text to an array of indices (0-255).
 * Uses UTF-8 byte values directly.
 */
export const textToIndices = (text: string): number[] => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return Array.from(bytes);
};

export const indicesToMnemonic = (indices: number[]): string => {
  const wordlist = bip39.wordlists.english;
  return indices.map(index => wordlist[index]).join(' ');
};

/**
 * Converts an array of indices (0-255) back to text.
 * Indices > 255 are ignored or treated as errors in text context,
 * but here we just filter or clamp? 
 * Since we only generate 0-255 from textToIndices, this is fine.
 * If we try to convert a real mnemonic (indices up to 2047) to text,
 * it will produce garbage or fail if we don't handle it.
 */
export const indicesToText = (indices: number[]): string | null => {
  try {
    // Filter indices to ensure they are valid byte values (0-255)
    // If we have indices > 255, it's likely a real mnemonic, not text.
    if (indices.some(i => i > 255 || i < 0)) return null;
    
    const bytes = new Uint8Array(indices);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch (e) {
    return null;
  }
};

/**
 * Encode an index (0-2047) into a "Page-Line-Col" format.
 * Strategy:
 * Page = (Index % 400) + 1   (Range: 1-400)
 * Line = (Index / 400) + 1   (Range: 1-6)
 * Col  = Random (1-20)       (Ignored during decode)
 */
export const encodeIndexToBookCipher = (index: number): string => {
  const pageSize = 400;
  const page = (index % pageSize) + 1;
  const line = Math.floor(index / pageSize) + 1;
  const col = Math.floor(Math.random() * 20) + 1; 
  
  return `${page}-${line}-${col}`;
};

export const decodeBookCipherToIndex = (cipher: string): number => {
  const parts = cipher.split('-');
  if (parts.length < 2) throw new Error('Invalid format');
  
  const page = parseInt(parts[0]);
  const line = parseInt(parts[1]);
  
  const pageSize = 400;
  const maxLine = 2000; 
  
  // Security Hardening: Validate ranges to prevent logic overflow attacks
  if (isNaN(page) || page < 1 || page > pageSize) {
    throw new Error('Invalid page number (Must be 1-400)');
  }
  if (isNaN(line) || line < 1 || line > maxLine) {
    throw new Error('Invalid line number (Must be 1-2000)');
  }
  
  return (line - 1) * pageSize + (page - 1);
};

export const isBookCipherIndices = (text: string): boolean => {
  // Simple check: does it look like "1-1-1 2-2-2"?
  // At least one pattern of digits-digits-digits
  const pattern = /\d+-\d+-\d+/;
  return pattern.test(text);
};
