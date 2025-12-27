
import { split, combine } from './src/utils/shamir';

const run = async () => {
    try {
        const secret = "network edit tray column panic shadow genius grocery erase glance edit pact";
        console.log("Original Secret:", secret);

        // Test Split
        console.log("Splitting secret into 3 shares, threshold 2...");
        const shares = await split(secret, 3, 2);
        console.log("Shares generated:");
        shares.forEach(s => {
            console.log(s.substring(0, 50) + "...");
            // Check if share contains the secret in plain text (hex decoded)
            // The share format is ID-HEX.
            const parts = s.split('-');
            const hex = parts[1];
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            if (str.includes("network")) {
                console.error("CRITICAL: Share leaks secret!");
                console.log("Decoded share content:", str);
            }
        });

        // Test Combine with 2 shares
        console.log("Combining share 1 and 2...");
        const recovered = await combine([shares[0], shares[1]]);
        console.log("Recovered:", recovered);

        if (recovered === secret) {
            console.log("SUCCESS: Secret recovered correctly.");
        } else {
            console.error("FAILURE: Recovered secret does not match.");
        }

        // Test Integrity Check Failure (Tampering)
        console.log("Testing Tampering...");
        const tamperedShare = shares[0].replace('a', 'b'); // Change one hex char
        try {
            await combine([tamperedShare, shares[1]]);
            console.error("FAILURE: Tampered share was accepted!");
        } catch (e) {
            console.log("SUCCESS: Tampered share detected:", e.message);
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
};

run();
