# CryptoKey (Community Edition)

**Official Website**: [https://CryptoKey.im](https://CryptoKey.im)  
**Telegram**: [@C_2046](https://t.me/C_2046)  
**X (Twitter)**: [@CryptoKeyim](https://x.com/CryptoKeyim)

> **Note**: This is the public audit repository for CryptoKey.im.  
> The core commercial encryption algorithms (`wasm-pro`) and payment logic (`workers`) have been replaced with stubs.

## License

## 🔒 What is CryptoKey.im?

CryptoKey.im is a **client-side only** secure tool designed to solve the "Chicken and Egg" problem of password management. It allows you to:

1. **Encrypt Sensitive Data**: Encrypt your mnemonics, private keys, or passwords using AES-256-GCM.
2. **Steganography Backup**: Hide the encrypted data inside an innocent-looking image (like a cat photo).
3. **Physical Backup**: Print a "Recovery Sheet" that allows you to recover your data even if all your devices are lost.
4. **Zero Trust**: No server, no database, no tracking. Everything happens in your browser.

## 🚀 Key Features

- **Military-Grade Encryption**: Uses AES-256-GCM derived from your password using PBKDF2 (100k iterations).
- **Steganography**: Hides encrypted data in PNG images without visible distortion.
- **Offline Capable**: Works 100% offline. You can download the HTML or use the PWA.
- **Open Source**: Verify the code yourself. No hidden backdoors.

## 🛠️ Tech Stack

- **React 18** + **Vite**
- **TypeScript**
- **TailwindCSS**
- **Framer Motion** (Animations)
- **Crypto-JS** (Encryption)
- **Ethers.js** (Wallet generation)

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/CryptoKey.im.git

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## ⚠️ Security Notice

- This tool is provided "as is".
- Always verify the URL is `https://CryptoKey.im` (or your own deployment).
- For maximum security, download the release and run it on an air-gapped machine.
