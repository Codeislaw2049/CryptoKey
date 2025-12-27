
const LOG = [];
const EXP = [];

// Initialize tables
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
const mul = (a, b) => {
  if (a === 0 || b === 0) return 0;
  const logA = LOG[a];
  const logB = LOG[b];
  return EXP[(logA + logB) % 255];
};
const getPower = (base, exp) => {
  if (exp === 0) return 1;
  let res = 1;
  for (let i = 0; i < exp; i++) res = mul(res, base);
  return res;
};

const secretBytes = [0x6e, 0x65, 0x74, 0x77, 0x6f, 0x72, 0x6b]; // "network"
const threshold = 2;
const shares = 3;

console.log("Secret:", secretBytes.map(b => b.toString(16)).join(' '));

for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
    const coeffs = [secretBytes[byteIdx]];
    for (let j = 1; j < threshold; j++) {
        coeffs.push(Math.floor(Math.random() * 256));
    }
    
    console.log(`Byte ${byteIdx} Coeffs:`, coeffs);

    for (let i = 1; i <= shares; i++) {
        let val = coeffs[0];
        for (let k = 1; k < coeffs.length; k++) {
            const term = mul(coeffs[k], getPower(i, k));
            val = add(val, term);
        }
        console.log(`  Share ${i} Byte ${byteIdx}: ${val.toString(16)} (Plain: ${secretBytes[byteIdx].toString(16)})`);
    }
}
