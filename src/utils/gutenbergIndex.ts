import { wordlists } from 'bip39';
import { encryptWithAES, decryptWithAES } from './crypto';

// Use the BIP39 English wordlist
const BIP39_WORDLIST = wordlists.english;

// Helper: Shuffle Array
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// --- Mining Logic (Common for Project 4 & 5) ---

/**
 * Find an offset in the text where Hash(Substring) % 2048 == TargetIndex
 * This effectively "hides" the mnemonic word index in the text structure.
 */
const findOffsetForIndex = (
  targetIndex: number,
  text: string,
  segmentLength: number = 8
): number => {
  // We limit search to avoid freezing UI on huge texts, but Gutenberg texts are usually manageable.
  // We can scan up to 100,000 chars.
  const maxScan = Math.min(text.length - segmentLength, 500000); 
  
  // Optimization: Start from a random position to avoid clustering at start?
  // Or just linear scan. Linear scan is deterministic if we start from 0.
  // If we want diversity, we can start random.
  // Let's scan from 0 to ensure we find a match if one exists.
  
  for (let i = 0; i < maxScan; i++) {
    // Simple fast hash for performance? 
    // No, security requires a decent hash to avoid statistical bias.
    // SHA256 is slow for 100k iterations in JS single thread.
    // Let's use a simpler but uniform hash: FNV-1a or Murmur?
    // Or just a simple polynomial rolling hash?
    // Rolling hash is very fast.
    // Polynomial: (c1 * 31^k + c2 * 31^(k-1) ... ) % 2048.
    // We need it to be consistent across platforms.
    
    // Let's use a custom simple hash function to ensure speed and consistency.
    const sub = text.slice(i, i + segmentLength);
    let hash = 0;
    for (let j = 0; j < sub.length; j++) {
      hash = ((hash << 5) - hash) + sub.charCodeAt(j);
      hash |= 0; // Convert to 32bit integer
    }
    // Map to 0-2047 (positive)
    const index = Math.abs(hash) % 2048;
    
    if (index === targetIndex) return i;
  }
  
  throw new Error(`Could not find a match for word index ${targetIndex} (${BIP39_WORDLIST[targetIndex]}) in the provided text. Text might be too short or lack entropy.`);
};

// Verification helper (Optional for now)
// const verifyOffset = (
//   fullText: string,
//   offset: number,
//   length: number,
//   expectedText: string
// ) => {
//   const segment = fullText.substr(offset, length);
//   return segment === expectedText;
// };

// --- Project 4 Logic (TXT File) ---

/**
 * Mnemonic to Character Offsets (Mining) - Scheme 1: Offset-Length
 * Returns array of "Offset-Length" strings
 */
export const indicesToOffset = (
  indices: number[],
  fullText: string
): string[] => {
  return indices.map(idx => {
    const offset = findOffsetForIndex(idx, fullText, 8);
    return `${offset}-8`;
  });
};

export const mnemonicToOffset = (
  mnemonic: string,
  fullText: string
): string[] => {
  const words = mnemonic.trim().split(/\s+/);
  const indices = words.map(w => BIP39_WORDLIST.indexOf(w));
  if (indices.some(i => i === -1)) throw new Error('Invalid mnemonic word found');
  
  return indicesToOffset(indices, fullText);
};

/**
 * Mnemonic to Chapter Indices - Scheme 2: Chapter-Line-Char
 * Returns array of "Chapter-Line-Char" strings
 */
export const indicesToChapterIndices = (
  indices: number[],
  chapters: Array<{ id: number; start: number; end: number; text: string }>
): string[] => {
  return indices.map(targetIdx => {
    // Search in chapters
    for (const chapter of chapters) {
      const lines = chapter.text.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        // Try to find a match in this line
        try {
            const charIdx = findOffsetForIndex(targetIdx, line, 8);
            return `${chapter.id}-${lineIdx + 1}-${charIdx + 1}`; // 1-based indexing
        } catch (e) {
            continue;
        }
      }
    }
    throw new Error(`Could not find index ${targetIdx} in any chapter.`);
  });
};

export const mnemonicToChapterIndices = (
  mnemonic: string,
  chapters: Array<{ id: number; start: number; end: number; text: string }>
): string[] => {
  const words = mnemonic.trim().split(/\s+/);
  const wordIndices = words.map(w => BIP39_WORDLIST.indexOf(w));
  if (wordIndices.some(i => i === -1)) throw new Error('Invalid mnemonic word found');

  return indicesToChapterIndices(wordIndices, chapters);
};

/**
 * Mnemonic to Virtual Line Indices - Scheme 3: VirtualLine-Char
 * Returns array of "Line-Char" strings
 */
export const indicesToVirtualLineIndices = (
  indices: number[],
  virtualLines: string[]
): string[] => {
  return indices.map(targetIdx => {
    // Search in virtual lines
    for (let lineIdx = 0; lineIdx < virtualLines.length; lineIdx++) {
      const line = virtualLines[lineIdx];
      try {
        const charIdx = findOffsetForIndex(targetIdx, line, 8);
        return `${lineIdx + 1}-${charIdx + 1}`; // 1-based
      } catch (e) {
        continue;
      }
    }
    throw new Error(`Could not find index ${targetIdx} in any virtual line.`);
  });
};

export const mnemonicToVirtualLineIndices = (
  mnemonic: string,
  virtualLines: string[]
): string[] => {
  const words = mnemonic.trim().split(/\s+/);
  const wordIndices = words.map(w => BIP39_WORDLIST.indexOf(w));
  if (wordIndices.some(i => i === -1)) throw new Error('Invalid mnemonic word found');

  return indicesToVirtualLineIndices(wordIndices, virtualLines);
};

/**
 * Restore Indices from Offsets
 */
export const offsetsToIndices = (
  offsets: string[],
  fullText: string
): number[] => {
  return offsets.map(str => {
    // Consistent fallback for invalid offsets
    const fallbackHash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackIndex = fallbackHash % 2048;

    const parts = str.split('-').map(Number);
    if (parts.length !== 2) return fallbackIndex;
    
    const [offset, length] = parts;
    
    // Safety check for NaN or bounds
    if (isNaN(offset) || isNaN(length)) return fallbackIndex;
    if (offset < 0 || offset >= fullText.length) return fallbackIndex;

    const sub = fullText.slice(offset, offset + length);
    
    // If slice is empty (e.g. offset at end of string), fallback
    if (!sub) return fallbackIndex;

    let hash = 0;
    for (let j = 0; j < sub.length; j++) {
      hash = ((hash << 5) - hash) + sub.charCodeAt(j);
      hash |= 0;
    }
    return Math.abs(hash) % 2048;
  });
};

/**
 * Restore Mnemonic from Offsets
 */
export const offsetsToMnemonic = (
  offsets: string[],
  fullText: string
): string => {
  const indices = offsetsToIndices(offsets, fullText);
  return indices.map(i => BIP39_WORDLIST[i]).join(' ');
};

/**
 * Restore Indices from Chapter Indices
 */
export const chapterIndicesToIndices = (
  indices: string[],
  chapters: Array<{ id: number; start: number; end: number; text: string }>
): number[] => {
  return indices.map(str => {
    // Determine a consistent "random" fallback based on the input string
    // This ensures that the same "wrong" row always produces the same "wrong" result
    // instead of throwing an error.
    const fallbackHash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackIndex = fallbackHash % 2048;

    const parts = str.split('-').map(Number);
    if (parts.length !== 3) return fallbackIndex;
    const [chapId, lineIdx, charIdx] = parts;
    
    const chapter = chapters.find(c => c.id === chapId);
    if (!chapter) return fallbackIndex;
    
    const lines = chapter.text.split('\n');
    if (lineIdx < 1 || lineIdx > lines.length) return fallbackIndex;
    
    const line = lines[lineIdx - 1]; // 0-based
    const start = charIdx - 1; // 0-based
    
    // Safety check for bounds
    if (start < 0 || start >= line.length) return fallbackIndex;

    // Default length is 8
    const sub = line.substr(start, 8);
    
    let hash = 0;
    for (let j = 0; j < sub.length; j++) {
      hash = ((hash << 5) - hash) + sub.charCodeAt(j);
      hash |= 0;
    }
    return Math.abs(hash) % 2048;
  });
};

/**
 * Restore Mnemonic from Chapter Indices
 */
export const chapterIndicesToMnemonic = (
  indices: string[],
  chapters: Array<{ id: number; start: number; end: number; text: string }>
): string => {
  const wordIndices = chapterIndicesToIndices(indices, chapters);
  return wordIndices.map(i => BIP39_WORDLIST[i]).join(' ');
};

/**
 * Restore Indices from Virtual Line Indices
 */
export const virtualLineIndicesToIndices = (
  indices: string[],
  virtualLines: string[]
): number[] => {
  return indices.map(str => {
    const fallbackHash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackIndex = fallbackHash % 2048;

    const parts = str.split('-').map(Number);
    if (parts.length !== 2) return fallbackIndex;
    const [lineIdx, charIdx] = parts;
    
    if (lineIdx < 1 || lineIdx > virtualLines.length) return fallbackIndex;
    
    const line = virtualLines[lineIdx - 1];
    const start = charIdx - 1;
    
    if (start < 0 || start >= line.length) return fallbackIndex;

    const sub = line.substr(start, 8);
    
    let hash = 0;
    for (let j = 0; j < sub.length; j++) {
      hash = ((hash << 5) - hash) + sub.charCodeAt(j);
      hash |= 0;
    }
    return Math.abs(hash) % 2048;
  });
};

/**
 * Restore Mnemonic from Virtual Line Indices
 */
export const virtualLineIndicesToMnemonic = (
  indices: string[],
  virtualLines: string[]
): string => {
  const wordIndices = virtualLineIndicesToIndices(indices, virtualLines);
  return wordIndices.map(i => BIP39_WORDLIST[i]).join(' ');
};

/**
 * Generate Fake Offset Indexes (Project 4)
 */
export const generateFakeOffsetIndexes = (
  realOffsets: string[],
  totalChars: number,
  count: number = 100
): string[][] => {
  // realOffsets is an array of 12 strings (the Real Row).
  // We need to generate `count` FAKE ROWS.
  // Each fake row has same length (12).
  
  const fakeRows: string[][] = [];
  const length = 8;
  
  for (let r = 0; r < count; r++) {
    const fakeRow: string[] = [];
    for (let c = 0; c < realOffsets.length; c++) {
      const fakeOffset = Math.floor(Math.random() * (totalChars - length));
      fakeRow.push(`${fakeOffset}-${length}`);
    }
    fakeRows.push(fakeRow);
  }
  
  return fakeRows;
};


// --- Project 5 Logic (URL Feature) ---

/**
 * Mnemonic to Index based on Web Features (Mining)
 */
export const indicesToIndex = (
  indices: number[],
  fullText: string,
  textHash: string
): string[] => {
  const hashPrefix = textHash.slice(0, 8);
  
  return indices.map(idx => {
    // Use the full text for mining to ensure we find matches
    const offset = findOffsetForIndex(idx, fullText, 8);
    return `${offset}-8-${hashPrefix}`;
  });
};

export const mnemonicToIndex = (
  mnemonic: string,
  fullText: string,
  textHash: string
): string[] => {
  const words = mnemonic.trim().split(/\s+/);
  const indices = words.map(w => BIP39_WORDLIST.indexOf(w));
  if (indices.some(i => i === -1)) throw new Error('Invalid mnemonic word found');

  return indicesToIndex(indices, fullText, textHash);
};

/**
 * Restore Indices from Index
 */
export const indexToIndices = (
  indexes: string[],
  fullText: string,
  textHash: string
): number[] => {
  const hashPrefix = textHash.slice(0, 8);
  
  return indexes.map(str => {
    const [offset, length, prefix] = str.split('-');
    if (prefix !== hashPrefix) throw new Error('Index hash mismatch (Wrong Book/URL?)');
    
    const off = parseInt(offset);
    const len = parseInt(length);
    
    const sub = fullText.slice(off, off + len);
    let hash = 0;
    for (let j = 0; j < sub.length; j++) {
      hash = ((hash << 5) - hash) + sub.charCodeAt(j);
      hash |= 0;
    }
    return Math.abs(hash) % 2048;
  });
};

/**
 * Restore Mnemonic from Index
 */
export const indexToMnemonic = (
  indexes: string[],
  fullText: string,
  textHash: string
): string => {
  const indices = indexToIndices(indexes, fullText, textHash);
  return indices.map(i => BIP39_WORDLIST[i]).join(' ');
};

/**
 * Generate Fake Indexes (Project 5)
 */
export const generateFakeWebIndexes = (
  realIndexes: string[],
  totalChars: number,
  textHash: string,
  count: number = 100
): string[][] => {
  const hashPrefix = textHash.slice(0, 8);
  const fakeRows: string[][] = [];
  const length = 8;

  for (let r = 0; r < count; r++) {
    const fakeRow: string[] = [];
    for (let c = 0; c < realIndexes.length; c++) {
      const fakeOffset = Math.floor(Math.random() * (totalChars - length));
      fakeRow.push(`${fakeOffset}-${length}-${hashPrefix}`);
    }
    fakeRows.push(fakeRow);
  }

  return fakeRows;
};

// ... Encrypt/Decrypt Wrappers ...
export const encryptIndexes = async (
  indexes: string[][], // Array of Rows
  password: string
): Promise<{ ciphertext: string; hash: string }> => {
   const data = JSON.stringify(indexes);
   return encryptWithAES(data, password);
};

export const decryptIndexes = async (
  ciphertext: string,
  password: string,
  hash?: string
): Promise<string[][]> => {
   const json = await decryptWithAES(ciphertext, password, hash);
   return JSON.parse(json);
};

