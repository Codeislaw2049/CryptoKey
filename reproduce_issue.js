import { webcrypto } from 'crypto';
const crypto = webcrypto;

// --- shamir.ts implementation converted to JS ---

const LOG = [];
const EXP = [];

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    let x2 = x << 1;
    if (x2 & 0x100) x2 ^= 0x11b;
    x = x2 ^ x;
  }
})();

const add = (a, b) => a ^ b;
const sub = (a, b) => a ^ b;
const mul = (a, b) => {
  if (a === 0 || b === 0) return 0;
  const logA = LOG[a];
  const logB = LOG[b];
  if (logA === undefined || logB === undefined) return 0;
  return EXP[(logA + logB) % 255];
};
const div = (a, b) => {
  if (b === 0) throw new Error("Division by zero");
  if (a === 0) return 0;
  const logA = LOG[a];
  const logB = LOG[b];
  return EXP[(logA - logB + 255) % 255];
};

const strToHex = (str) => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
};

const hexToStr = (hex) => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

const sha256 = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const combine = async (shares) => {
  if (shares.length === 0) return '';

  const parsedShares = [];
  let dataLength = -1;

  for (const share of shares) {
      const parts = share.split('-');
      if (parts.length !== 2) continue;
      
      const x = parseInt(parts[0], 10);
      const hexData = parts[1];
      
      const dataBytes = [];
      for (let i = 0; i < hexData.length; i += 2) {
          dataBytes.push(parseInt(hexData.substr(i, 2), 16));
      }
      
      if (dataLength === -1) {
          dataLength = dataBytes.length;
      } else if (dataLength !== dataBytes.length) {
          continue; 
      }
      
      if (!parsedShares.some(s => s.x === x)) {
        parsedShares.push({ x, data: dataBytes });
      }
  }

  if (parsedShares.length < 2) {
      throw new Error("Not enough valid shares to reconstruct");
  }

  let reconstructedHex = '';
  
  for (let byteIdx = 0; byteIdx < dataLength; byteIdx++) {
      let result = 0;
      for (let i = 0; i < parsedShares.length; i++) {
          const xi = parsedShares[i].x;
          const yi = parsedShares[i].data[byteIdx];
          let numerator = 1;
          let denominator = 1;
          for (let j = 0; j < parsedShares.length; j++) {
              if (i === j) continue;
              const xj = parsedShares[j].x;
              numerator = mul(numerator, xj);
              denominator = mul(denominator, sub(xi, xj));
          }
          const lagrange = mul(yi, div(numerator, denominator));
          result = add(result, lagrange);
      }
      reconstructedHex += result.toString(16).padStart(2, '0');
  }

  const reconstructedPayload = hexToStr(reconstructedHex);
  const separatorIndex = reconstructedPayload.indexOf('|');
  
  // Debug output
  console.log("Reconstructed Payload (raw):", reconstructedPayload);

  if (separatorIndex === -1 || separatorIndex !== 64) {
      throw new Error("Integrity check failed: Invalid payload format (Checksum mismatch)");
  }

  const extractedChecksum = reconstructedPayload.substring(0, 64);
  const extractedSecret = reconstructedPayload.substring(65);
  const calculatedChecksum = await sha256(extractedSecret);

  if (extractedChecksum !== calculatedChecksum) {
      throw new Error("Integrity check failed: Checksum mismatch (Corrupted or wrong shares)");
  }

  return extractedSecret;
};

// --- Reproduction Test ---

const share1 = "1-30306203353465393235396461a0ac33373233623966323462343137393732666333633837376134333634cc3265357c323617593966656462613335396431e77c6e6574776f72262009f56974207472617920636f6c756d6ebf70616ef317203e7561646f772067656ee94c732004726f63619d7920657261736520676c616e63652028646974247061d074";
const share3 = "3-303062623534653932353964616633333732336239663234623431373937326663336338373761343336343632653531323637383966656462613335396431347c6e6574776f726b2065646974207472617920636f6c756d6e2070616e696320736861646f772067656e6975732067726f6365727920657261736520676c616e636520656469742070616374";

(async () => {
    try {
        console.log("Analyzing Share 3...");
        const parts3 = share3.split('-');
        const hex3 = parts3[1];
        const str3 = hexToStr(hex3);
        console.log("Share 3 decoded (first 100 chars):", str3.substring(0, 100));
        
        const secret = "network edit tray column panic shadow genius grocery erase glance edit pact";
        console.log("Secret starts with:", secret.substring(0, 20));
        
        if (str3.includes(secret)) {
             console.log("CRITICAL: Share 3 CONTAINS the secret!");
             
             // Verify checksum of Share 3 as a payload
             const extractedChecksum = str3.substring(0, 64);
             const extractedSecret = str3.substring(65);
             const calculatedChecksum = await sha256(extractedSecret);
             
             console.log("Extracted Checksum:", extractedChecksum);
             console.log("Calculated Checksum:", calculatedChecksum);
             
             if (extractedChecksum === calculatedChecksum) {
                 console.log("SUCCESS: Share 3 IS a valid payload!");
             } else {
                 console.log("FAILURE: Share 3 checksum mismatch.");
             }
         } else {
             console.log("Share 3 does NOT contain the secret.");
         }

        console.log("Combining shares 1 and 3...");
        const result = await combine([share1, share3]);
        console.log("Success! Result:", result);
    } catch (e) {
        console.error("Failed:", e.message);
    }
})();
