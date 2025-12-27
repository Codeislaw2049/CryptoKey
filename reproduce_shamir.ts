
import { split, combine } from './src/utils/shamir';

const run = async () => {
    try {
        const secret = "network edit tray column panic shadow genius grocery erase glance edit pact";
        const n = 3;
        const k = 2;
        
        console.log(`Splitting secret: "${secret}" (N=${n}, K=${k})`);
        const shares = await split(secret, n, k);
        
        console.log("Shares generated:");
        shares.forEach(s => {
            const [id, hex] = s.split('-');
            console.log(`Share ${id}: ${hex.substring(0, 30)}...`);
            
            // Check if share content matches secret payload (heuristic)
            // We know payload starts with checksum.
            // Let's cheat and look at the first few bytes of share vs payload.
        });

        console.log("\nAttempting combine...");
        try {
            const reconstructed = await combine(shares.slice(0, 2)); // Use 2 shares
            console.log("Reconstructed:", reconstructed);
            if (reconstructed === secret) {
                console.log("SUCCESS: Secret matches.");
            } else {
                console.log("FAILURE: Secret mismatch.");
            }
        } catch (e: any) {
            console.error("Combine failed:", e.message);
        }

    } catch (e) {
        console.error("Error:", e);
    }
};

run();
