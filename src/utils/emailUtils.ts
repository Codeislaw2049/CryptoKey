/**
 * Pure frontend implementation of "ciphertext as email attachment"
 * (Auto-download attachment + invoke email client)
 * @param ciphertext Encrypted ciphertext
 * @param hash Ciphertext hash
 * @param userEmail User email (optional, for filling recipient)
 */
export const sendEmailWithAttachment = async (
  ciphertext: string,
  hash: string,
  userEmail?: string
) => {
  try {
    // Step 1: Generate ciphertext attachment file (.txt format, auto-download to user local)
    const filename = `cryptokey_backup_${Date.now()}.txt`;
    const fileContent = `【CryptoKey Secure Backup】
Ciphertext:
${ciphertext}

Hash:
${hash}

---
Decrypt at: https://cryptokey.im
Generated: ${new Date().toLocaleString()}
NOTE: Requires password + row index to decrypt.
`;

    // Auto download attachment (save to user default download folder)
    const blob = new Blob([fileContent], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Step 2: Invoke email client (fill subject/body guide, do not fill ultra-long ciphertext)
    const subject = encodeURIComponent('Encrypted Message via CryptoKey.im');
    const body = encodeURIComponent(`
【IMPORTANT INSTRUCTION】
1. Please ATTACH the file you just downloaded: "${filename}" (Check your Downloads folder);
2. This attachment contains your encrypted backup and hash. Do NOT delete or modify it;
3. You can fill in your own email as recipient for backup.

---
Decrypt this data at: https://cryptokey.im
---

Backup Time: ${new Date().toLocaleString()}
`);

    // Construct mailto link (only fill subject/body/recipient, no ultra-long ciphertext)
    const mailtoUrl = `mailto:${userEmail || ''}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    // Step 3: Display precise guidance (critical, lower user operation cost)
    // Using a small timeout to ensure mail client is invoked first
    setTimeout(() => {
      alert(`
✅ Action Required:

1. Your email client should be open now.
2. Please CLICK "Attach File" in your email.
3. Select the file "${filename}" from your DOWNLOADS folder.
4. Send the email to yourself to complete backup!

⚠️ If you can't find the file, check your browser's download history (Ctrl+J or Command+J).
      `);
    }, 1000);

  } catch (e) {
    alert(`Operation failed: ${(e as Error).message}. Please manually download and send email!`);
  }
};
