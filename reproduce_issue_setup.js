const { combine, split } = require('./src/utils/shamir');

// Mock browser environment for shamir.ts if needed (it uses crypto for random)
// But shamir.ts might import 'crypto' or use window.crypto.
// Let's check shamir.ts content again. 
// I'll read shamir.ts first to ensure I can run it in node.

const share1 = "1-30306203353465393235396461a0ac33373233623966323462343137393732666333633837376134333634cc3265357c323617593966656462613335396431e77c6e6574776f72262009f56974207472617920636f6c756d6ebf70616ef317203e7561646f772067656ee94c732004726f63619d7920657261736520676c616e63652028646974247061d074";
const share3 = "3-303062623534653932353964616633333732336239663234623431373937326663336338373761343336343632653531323637383966656462613335396431347c6e6574776f726b2065646974207472617920636f6c756d6e2070616e696320736861646f772067656e6975732067726f6365727920657261736520676c616e636520656469742070616374";

async function run() {
    try {
        console.log("Attempting to combine shares...");
        const result = await combine([share1, share3]);
        console.log("Result:", result);
    } catch (e) {
        console.error("Error combining:", e.message);
    }
}

// I need to make sure I can require shamir.ts. 
// It's a TS file. I should probably copy the content of shamir.ts to a JS file to run it, 
// or use ts-node if available. 
// For simplicity, I will read shamir.ts and create a shamir_test_impl.js
