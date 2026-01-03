import i18n from '../i18n';

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
    const t = i18n.t;

    // Step 1: Generate ciphertext attachment file (.txt format, auto-download to user local)
    const filename = `cryptokey_backup_${Date.now()}.txt`;
    const fileContent = `${t('email.file.header')}
${t('email.file.ciphertext')}
${ciphertext}

${t('email.file.hash')}
${hash}

---
${t('email.file.footer')}
${t('email.file.generated', { date: new Date().toLocaleString() })}
${t('email.file.note')}
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
    const subject = encodeURIComponent(t('email.subject'));
    const body = encodeURIComponent(`
${t('email.body.instruction')}
1. ${t('email.body.step1', { filename })}
2. ${t('email.body.step2')}
3. ${t('email.body.step3')}

---
${t('email.body.footer')}
---

${t('email.body.time', { date: new Date().toLocaleString() })}
`);

    // Construct mailto link (only fill subject/body/recipient, no ultra-long ciphertext)
    const mailtoUrl = `mailto:${userEmail || ''}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    // Step 3: Display precise guidance (critical, lower user operation cost)
    // Using a small timeout to ensure mail client is invoked first
    setTimeout(() => {
      alert(`
${t('email.alert.title')}

1. ${t('email.alert.step1')}
2. ${t('email.alert.step2')}
3. ${t('email.alert.step3', { filename })}
4. ${t('email.alert.step4')}

${t('email.alert.warning')}
      `);
    }, 1000);

  } catch (e) {
    alert(`${i18n.t('email.error', { error: (e as Error).message })}`);
  }
};
