
import { generateKeyPairSync, sign, createPrivateKey, createPublicKey } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// File paths
const PRIVATE_KEY_PATH = path.join(process.cwd(), 'scripts', 'license_private.pem');
const PUBLIC_KEY_PATH = path.join(process.cwd(), 'scripts', 'license_public.pem');

// 1. Generate Keys
function generateKeys() {
    console.log("Generating Ed25519 Key Pair...");
    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

    console.log(`Keys saved to:\n  ${PRIVATE_KEY_PATH}\n  ${PUBLIC_KEY_PATH}`);
    
    // Also export raw bytes for the frontend
    const rawPublicKey = createPublicKey(publicKey).export({ format: 'jwk' });
    // Note: Node's crypto might not easily give raw bytes for Ed25519 via export() in older versions, 
    // but let's try to extract it from the DER/PEM or use 'jwk'.
    // Actually, for Ed25519, the public key is just the last 32 bytes of the SPKI SubjectPublicKeyInfo 
    // (after the OID header).
    // Let's print the hex of the raw key for easier copying.
    
    // Quick hack to get raw bytes from SPKI PEM:
    // Remove header/footer/newlines, base64 decode.
    // The SPKI header for Ed25519 is usually 12 bytes: 30 2a 30 05 06 03 2b 65 70 03 21 00
    // So the last 32 bytes are the key.
    
    const pemContent = publicKey.toString().replace(/-----BEGIN PUBLIC KEY-----/g, '')
                                         .replace(/-----END PUBLIC KEY-----/g, '')
                                         .replace(/\s/g, '');
    const buffer = Buffer.from(pemContent, 'base64');
    // The raw key is at the end. Ed25519 keys are 32 bytes.
    const rawBytes = buffer.subarray(buffer.length - 32);
    
    console.log("\n[FRONTEND CONFIG]");
    console.log("Copy this byte array to src/utils/licenseVerification.ts (OFF_PUB_KEY_RAW):");
    console.log(`[${rawBytes.join(', ')}]`);
}

// 2. Sign License
function signLicense(contentString: string) {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        console.error("Private key not found! Run generate first.");
        return;
    }

    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const privateKey = createPrivateKey(privateKeyPem);

    const signature = sign(null, Buffer.from(contentString), privateKey);
    const signatureHex = signature.toString('hex');

    const licenseData = {
        content: contentString,
        signature: signatureHex
    };

    console.log("\n[GENERATED LICENSE]");
    console.log(JSON.stringify(licenseData, null, 2));

    // Write to public/license.key
    const outputPath = path.join(process.cwd(), 'public', 'license.key');
    fs.writeFileSync(outputPath, JSON.stringify(licenseData, null, 2));
    console.log(`\nSaved to ${outputPath}`);
}

// CLI Args
const args = process.argv.slice(2);
const command = args[0];

if (command === 'gen') {
    generateKeys();
} else if (command === 'sign') {
    const content = args[1] || "VALID_OFFLINE_KEY_SIGNED_BY_CRYPTOKEY_OFFICIAL";
    signLicense(content);
} else {
    console.log("Usage:");
    console.log("  npx tsx scripts/license_tools.ts gen              # Generate new keys");
    console.log("  npx tsx scripts/license_tools.ts sign [content]   # Sign content (default: standard string)");
}
