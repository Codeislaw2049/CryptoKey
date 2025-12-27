export const getDeviceFingerprint = async (): Promise<string> => {
    // Collect device-specific data
    // 1. User Agent (Browser/OS)
    // 2. Language
    // 3. Timezone
    // 4. Screen Resolution
    // 5. Hardware Concurrency (if available)
    // 6. Color Depth
    
    const data = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        window.screen.width + 'x' + window.screen.height,
        window.screen.colorDepth,
        navigator.hardwareConcurrency || 1,
    ].join('|');
    
    // Hash it using SHA-256 for privacy and consistency
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
