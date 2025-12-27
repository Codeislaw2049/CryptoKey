
import { hexToStr, sha256 } from './src/utils/shamir';
import { combine } from './src/utils/shamir';

// Override combine locally to debug
const combineDebug = async (shares: string[]): Promise<string> => {
  // Copied from shamir.ts but with logs
  const parsedShares: { x: number; data: number[] }[] = [];
  let dataLength = -1;

  for (const share of shares) {
      const parts = share.split('-');
      const x = parseInt(parts[0], 10);
      const hexData = parts[1];
      const dataBytes = [];
      for (let i = 0; i < hexData.length; i += 2) {
          dataBytes.push(parseInt(hexData.substr(i, 2), 16));
      }
      if (dataLength === -1) dataLength = dataBytes.length;
      parsedShares.push({ x, data: dataBytes });
  }

  // GF(2^8) logic needs to be imported or duplicated.
  // Since I can't easily import non-exported GF functions, I rely on the fact that if math is wrong, it's wrong everywhere.
  // But I want to see the 'reconstructedPayload'.
  
  // Actually, I can just modify shamir.ts to log, run the test, and then revert.
  // That's easier than duplicating all the GF math.
  return combine(shares);
};

const share1 = "3-5d7b8fda9fea3703ab14711160605e07b06cfa1f9be10af3dcddfba593f549e732b2e2c88b4dc37ec6a5fa04cd289c0bc74212e1710af7c198d48fca083c2cee5b5eb4272749ec58f5";
const share2 = "1-e09e5991c48dc645494a01d6f3001ab04a0472dc591b4486ff6b7927c0118cea3eb7eb00cc8a6fff93b412b7613e36b496ef2c869eb311f43495a89344323c8f61767259de9236b576";

async function test() {
    try {
        console.log("Attempting to combine...");
        const result = await combineDebug([share1, share2]);
        console.log("Success! Result:", result);
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

test();
