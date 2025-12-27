import * as bip39 from 'bip39';

const mnemonic = "turtle silver window harbor cactus motion lemon planet ribbon forest anchor sunset";
const isValid = bip39.validateMnemonic(mnemonic);
console.log(`Is valid: ${isValid}`);

if (!isValid) {
    // Try to find out why (though bip39 doesn't give details, we can check words)
    const words = mnemonic.split(' ');
    const wordlist = bip39.wordlists.english;
    const invalidWords = words.filter(w => !wordlist.includes(w));
    console.log(`Invalid words: ${JSON.stringify(invalidWords)}`);
}
