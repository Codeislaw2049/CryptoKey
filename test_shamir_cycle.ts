
import { split, combine } from './src/utils/shamir';

async function testCycle() {
    const secret = "TestSecret123!@#中文";
    console.log("Original:", secret);
    
    try {
        const shares = await split(secret, 3, 2);
        console.log("Shares:", shares);
        
        const recovered = await combine(shares.slice(0, 2));
        console.log("Recovered:", recovered);
        
        if (recovered === secret) {
            console.log("Test PASSED");
        } else {
            console.log("Test FAILED");
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

testCycle();
