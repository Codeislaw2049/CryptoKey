const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');
// Exclude 'en' and 'zh' as they are already updated
const locales = ['de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'tr', 'vi', 'zh-TW'];

const landingKeys = {
  card1: {
    title: "Backup Mnemonic",
    desc: "Securely hide your crypto recovery phrase in a physical book."
  },
  card2: {
    title: "Encrypt Privacy Files",
    desc: "Protect photos, documents, and sensitive files with book cipher."
  },
  card3: {
    title: "Restore Data",
    desc: "Decrypt your data using your book key and password."
  }
};

locales.forEach(locale => {
  const filePath = path.join(localesDir, locale, 'translation.json');
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);

      // Add landing keys if not present
      if (!json.landing) {
        json.landing = landingKeys;
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated ${locale} with landing keys`);
      } else {
        console.log(`Landing keys already exist in ${locale}`);
      }
    } catch (e) {
      console.error(`Error processing ${locale}:`, e);
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
});
