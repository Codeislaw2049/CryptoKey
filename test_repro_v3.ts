
import { split, combine } from './src/utils/shamir';
import { mixDataInRows, generateFakeIndices } from './src/utils/generator';

// Mock crypto for node
const crypto = require('crypto');
global.crypto = {
    subtle: {
        digest: async (algo, data) => {
            const hash = crypto.createHash('sha256');
            hash.update(data);
            return hash.digest();
        }
    }
} as any;
global.TextEncoder = require('util').TextEncoder;

const testShamir = async () => {
    console.log("Testing Shamir...");
    const secret = "network edit tray column panic shadow genius grocery erase glance edit pact";
    console.log("Secret:", secret);
    
    try {
        const shares = await split(secret, 3, 2);
        console.log("Shares generated:", shares.length);
        shares.forEach(s => {
            console.log(`Share ${s.slice(0, 50)}...`);
            // Check if share contains the secret hex
            // Secret hex starts with... well, let's decode the share content
            const parts = s.split('-');
            const data = parts[1];
            // Decode hex to string
            let str = '';
            for (let i = 0; i < data.length; i += 2) {
                str += String.fromCharCode(parseInt(data.substr(i, 2), 16));
            }
            console.log(`Share ${parts[0]} decoded start:`, str.slice(0, 50));
            if (str.includes(secret)) {
                console.error(`CRITICAL: Share ${parts[0]} contains the secret!`);
            }
        });

        const recovered = await combine(shares.slice(0, 2));
        console.log("Recovered:", recovered);
        if (recovered === secret) console.log("SUCCESS");
        else console.error("FAILURE: Recovered secret does not match");

    } catch (e) {
        console.error("Error:", e);
    }
};

const testMixRows = () => {
    console.log("\nTesting Mix Rows...");
    const realData = ["real1", "real2", "real3"];
    const rowCount = 100;
    const { rows, realRowIndex } = mixDataInRows(realData, rowCount);
    console.log(`Requested rows: ${rowCount}`);
    console.log(`Generated rows: ${rows.length}`);
    console.log(`Real row index: ${realRowIndex}`);
    console.log(`Row at index length: ${rows[realRowIndex].length}`);
    
    if (rows.length !== rowCount) {
        console.error(`ERROR: Row count mismatch! Expected ${rowCount}, got ${rows.length}`);
    } else {
        console.log("SUCCESS: Row count matches.");
    }

    // Test Duress logic (simulation)
    const duressFakeContent = "fake-content";
    let fakeData = [duressFakeContent];
    if (realData.length > 1) {
        const padding = generateFakeIndices(realData.length - 1);
        fakeData = [...fakeData, ...padding];
    }
    console.log("Fake Data Length:", fakeData.length);
    const { rows: fakeRows } = mixDataInRows(fakeData, rowCount);
    console.log(`Fake Rows Generated: ${fakeRows.length}`);
     if (fakeRows.length !== rowCount) {
        console.error(`ERROR: Fake Row count mismatch! Expected ${rowCount}, got ${fakeRows.length}`);
    } else {
        console.log("SUCCESS: Fake Row count matches.");
    }
};

(async () => {
    await testShamir();
    testMixRows();
})();
