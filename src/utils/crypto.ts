/**
 * AES-256-GCM Encryption/Decryption using Web Crypto API
 */

export const encryptWithAES = async (
  data: string,
  password: string
): Promise<{ ciphertext: string; hash: string }> => {
  const encoder = new TextEncoder();
  
  // 1. Generate a random salt for PBKDF2
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 2. Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 3. Derive the actual AES key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // 4. Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 5. Encrypt
  // Note: Web Crypto API's AES-GCM automatically appends the Authentication Tag (16 bytes)
  // to the end of the ciphertext.
  // Result 'encrypted' = Ciphertext + AuthTag
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, // tagLength defaults to 128 bits (16 bytes)
    key,
    encoder.encode(data)
  );

  // 6. Pack everything: Salt (16) + IV (12) + Ciphertext + AuthTag
  // We attach Salt and IV to the beginning of the ciphertext for easy extraction
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  // Use helper to avoid stack overflow with spread operator
  const ciphertextStr = arrayBufferToBase64(combined);

  // 7. Hash the result for integrity check
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(ciphertextStr));
  const hashStr = arrayBufferToBase64(new Uint8Array(hashBuffer));

  return { ciphertext: ciphertextStr, hash: hashStr };
};

export const decryptWithAES = async (
  ciphertext: string,
  password: string,
  hash?: string // Optional integrity check
): Promise<string> => {
  const encoder = new TextEncoder();

  // 1. Verify Hash if provided
  if (hash) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(ciphertext));
    const calculatedHash = arrayBufferToBase64(new Uint8Array(hashBuffer));
    if (calculatedHash !== hash) {
      throw new Error('Integrity check failed: Data has been tampered with.');
    }
  }

  // 2. Decode Base64
  const combinedStr = atob(ciphertext);
  const combined = new Uint8Array(combinedStr.length);
  for (let i = 0; i < combinedStr.length; i++) {
    combined[i] = combinedStr.charCodeAt(i);
  }

  // 3. Extract Salt (16 bytes), IV (12 bytes), and Encrypted Data
  // Check for legacy format (no salt, just IV+Data) - Heuristic: Length check or versioning?
  // Current legacy format: IV(12) + Data.
  // New format: Salt(16) + IV(12) + Data.
  // We can try to detect. But since this is a dev env, we might just enforce new format or try both.
  // Let's assume new format for now. If decryption fails, we could try legacy logic (SHA-256 hash key).
  
  try {
      if (combined.length < 28) throw new Error('Invalid data length');
      
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
  } catch (e) {
      // Fallback for Legacy Format (IV + Data, Key = SHA256(Password))
      // Legacy structure: IV (12) + Data
      try {
          const iv = combined.slice(0, 12);
          const data = combined.slice(12);
          
          const passwordHash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
          const key = await crypto.subtle.importKey(
            'raw',
            passwordHash,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );
          
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
          );
          
          return new TextDecoder().decode(decrypted);
      } catch (legacyError) {
          throw new Error('Decryption failed. Wrong password or corrupted data.');
      }
  }
};

// Helper to encode ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};
