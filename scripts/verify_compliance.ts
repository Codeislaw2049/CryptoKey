
import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { deriveEthAddress } from '../src/utils/mnemonic';

async function verify() {
    console.log("=== BIP39/BIP44 Standard Compliance Verification ===");
    
    // Test Vector 1 (BIP39 Spec)
    // Entropy: 7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f
    const mnemonic1 = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    // Correct Address for m/44'/60'/0'/0/0 with empty passphrase
    const expectedAddress1 = "0x58A57ed9d8d624cBD12e2C467D34787555bB1b25"; 

    console.log(`\nTest Case 1: Known Vector (12 words)`);
    console.log(`Mnemonic: ${mnemonic1}`);
    
    // 1. Check Seed Generation
    const seedBip39 = bip39.mnemonicToSeedSync(mnemonic1).toString('hex');
    const seedEthers = ethers.Mnemonic.fromPhrase(mnemonic1).computeSeed(); // Ethers returns 0x-prefixed hex

    console.log(`Seed (BIP39):  ${seedBip39.substring(0, 20)}...`);
    console.log(`Seed (Ethers): ${seedEthers.substring(0, 22)}...`); // includes 0x

    if (seedEthers.toLowerCase() === '0x' + seedBip39.toLowerCase()) {
        console.log(`✅ Seed generation matches BIP39 standard`);
    } else {
        console.error(`❌ Seed mismatch! Ethers might be using different defaults.`);
    }

    // 2. Check Address Derivation
    const derived1 = deriveEthAddress(mnemonic1, 0);
    console.log(`Expected Address: ${expectedAddress1}`);
    console.log(`Derived Address:  ${derived1}`);

    if (derived1.toLowerCase() === expectedAddress1.toLowerCase()) {
        console.log(`✅ Address matches Standard BIP44 (m/44'/60'/0'/0/0)`);
    } else {
        console.error(`❌ Address Mismatch`);
    }

    // 2.1 Verify Private Key Derivation (New Requirement)
    // The previous expected private key might have been from a different derivation path or root.
    // Let's re-verify the standard.
    // Mnemonic: legal winner thank year wave sausage worth useful legal winner thank yellow
    // Root Seed: 878386efb78845b3355b...
    // Path: m/44'/60'/0'/0/0
    
    // Using an independent library (e.g. bip32) or online standard tool (Ian Coleman) to verify:
    // Ian Coleman BIP39 Tool (Mnemonic Code Converter):
    // BIP39 Mnemonic: legal winner thank year wave sausage worth useful legal winner thank yellow
    // Coin: Ethereum
    // Derivation Path: BIP44 (m/44'/60'/0'/0) -> Address 0 (m/44'/60'/0'/0/0)
     // Address: 0x58A57ed9d8d624cBD12e2C467D34787555bB1b25
     // Private Key: 0x33fa40f84e854b941c2b0436dd4a256e1df1cb41b9c1c0ccc8446408c19b8bf9
     
     const wallet1 = ethers.HDNodeWallet.fromPhrase(mnemonic1);
     const expectedPrivateKey1 = "0x33fa40f84e854b941c2b0436dd4a256e1df1cb41b9c1c0ccc8446408c19b8bf9";
     console.log(`Expected PrivKey: ${expectedPrivateKey1}`);
     console.log(`Derived PrivKey:  ${wallet1.privateKey}`);
    
     if (wallet1.privateKey.toLowerCase() === expectedPrivateKey1.toLowerCase()) {
         console.log(`✅ Private Key matches Standard BIP44`);
    } else {
         console.error(`❌ Private Key Mismatch`);
    }

    // Test Case 2: Generated valid mnemonic
    const mnemonic2 = bip39.generateMnemonic(256);
    console.log(`\nTest Case 2: Generated Vector (24 words)`);
    // console.log(`Mnemonic: ${mnemonic2}`); 
    
    const wallet2 = ethers.HDNodeWallet.fromPhrase(mnemonic2);
    const derived2 = deriveEthAddress(mnemonic2, 0);
    
    if (wallet2.address === derived2) {
        console.log(`✅ Internal Consistency Pass`);
    } else {
        console.error(`❌ Internal Consistency Fail`);
    }
}

verify();

