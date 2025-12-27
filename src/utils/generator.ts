import { encodeIndexToBookCipher, generateMnemonic } from './mnemonic';

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Standard Book Cipher Fakes
const generateFakeBookCipher = (): string => {
  const randomIndex = Math.floor(Math.random() * 2048);
  return encodeIndexToBookCipher(randomIndex);
};

// Offset Fakes (e.g., 12345-8)
// const generateFakeOffset = (): string => {
//   const offset = Math.floor(Math.random() * 500000);
//   return `${offset}-8`;
// };

// URL Fakes (e.g., 12345-8-a1b2c3d4)
const generateFakeUrlIndex = (hashPrefix: string): string => {
  const offset = Math.floor(Math.random() * 500000);
  return `${offset}-8-${hashPrefix}`;
};

// Generic Fake Generator based on sample
const generateFakeBasedOnSample = (sample: string): string => {
  // Mnemonic Mode: Space separated words, no hyphens
  if (sample.includes(' ') && !sample.includes('-')) {
    // Generate a valid mnemonic of roughly the same length (12, 15, 18, 21, 24)
    // generateMnemonic() defaults to 12 words (128 bits). 
    // If original is longer, we could try to match, but generating a standard 12/24 is usually fine for plausibility.
    // However, generating a random one is safer.
    // NOTE: bip39.generateMnemonic returns 12 words by default.
    return generateMnemonic();
  }

  const parts = sample.split('-');
  
  // URL Mode: 3 parts, last part is hash (hex)
  if (parts.length === 3 && /^[0-9a-fA-F]{8,}$/.test(parts[2])) {
    return generateFakeUrlIndex(parts[2]);
  }

  // Chapter Mode: 3 parts, all numbers (Chapter-Line-Char)
  if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
    const p1Val = parseInt(parts[0]);
    const p2Val = parseInt(parts[1]);
    
    // Check if it fits Book Cipher constraints (Line <= 6, Page <= 400)
    // This ensures that if the user is using Physical Book mode (Mnemonic), 
    // the fake rows are also valid decodable Book Cipher coordinates.
    if (p2Val <= 6 && p1Val <= 400) {
       return generateFakeBookCipher();
    }

    // Otherwise, assume Chapter Mode or similar large-number scheme
    // Mimic the ranges of the sample roughly
    const p1 = Math.max(1, Math.floor(Math.random() * 100)); // Chapter
    const p2 = Math.max(1, Math.floor(Math.random() * 500)); // Line
    const p3 = Math.max(1, Math.floor(Math.random() * 80));  // Char
    return `${p1}-${p2}-${p3}`;
  }

  // Virtual Line Mode: 2 parts (Line-Char)
  if (parts.length === 2 && parts.every(p => /^\d+$/.test(p))) {
    const p1 = Math.max(1, Math.floor(Math.random() * 5000)); // Line
    const p2 = Math.max(1, Math.floor(Math.random() * 80));   // Char
    return `${p1}-${p2}`;
  }

  // Default fallback (Offset or Book Cipher)
  if (sample.includes('-')) {
      // Just generate random numbers for each part
      return parts.map(() => Math.floor(Math.random() * 10000)).join('-');
  }

  return generateFakeBookCipher();
};


export const generateFakeIndices = (count: number, sample?: string): string[] => {
  const fakeData: string[] = [];
  for (let i = 0; i < count; i++) {
    if (sample) {
      fakeData.push(generateFakeBasedOnSample(sample));
    } else {
      fakeData.push(generateFakeBookCipher());
    }
  }
  return fakeData;
};

export const mixDataInRows = (realData: string[], totalRows: number = 100): { rows: string[][]; realRowIndex: number } => {
  const rows: string[][] = [];
  const realRowIndex = Math.floor(Math.random() * totalRows); // 0 to 99

  // Use the first element of realData as a sample format
  const sample = realData.length > 0 ? realData[0] : undefined;

  for (let i = 0; i < totalRows; i++) {
    if (i === realRowIndex) {
      rows.push(realData);
    } else {
      // Generate a fake row with the same length as real data, using the sample format
      rows.push(generateFakeIndices(realData.length, sample));
    }
  }

  return { rows, realRowIndex };
};
