import * as OTPAuth from 'otpauth';
import CryptoJS from 'crypto-js';

// Generate a random Base32 secret (16 bytes / 128 bits roughly)
export const generateSecret = (): string => {
  return new OTPAuth.Secret({ size: 20 }).base32;
};

// Generate TOTP URI for QR Code
export const generateTotpUri = (secret: string, label: string, issuer: string = 'CryptoKey'): string => {
  const totp = new OTPAuth.TOTP({
    issuer,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  return totp.toString();
};

// Verify a token against a secret
export const verifyToken = (secret: string, token: string): boolean => {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  
  // validate returns the delta (window index) if valid, null if invalid
  // We allow a window of 1 (±30 seconds)
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
};

// Encrypt data using the Secret as key
export const encryptWithSecret = (data: string, secret: string): string => {
  return CryptoJS.AES.encrypt(data, secret).toString();
};

// Decrypt data using the Secret as key
export const decryptWithSecret = (ciphertext: string, secret: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
};
