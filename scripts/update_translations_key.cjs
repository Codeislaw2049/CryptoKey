const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');
const locales = ['de', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'tr', 'vi', 'zh', 'zh-TW'];

const translations = {
  de: "Mnemonik / Physisches Buch",
  en: "Mnemonic / Physical Book",
  es: "Mnemónico / Libro Físico",
  fr: "Mnémonique / Livre Physique",
  hi: "Mnemonic / Physical Book", // Using English as fallback for Hindi if script is complex to verify
  id: "Mnemonic / Buku Fisik",
  ja: "ニーモニック / 実体書籍",
  ko: "니모닉 / 실물 서적",
  pt: "Mnemônico / Livro Físico",
  tr: "Anımsatıcı / Fiziksel Kitap",
  vi: "Gợi nhớ / Sách Vật lý",
  zh: "助记词/实体书",
  "zh-TW": "助記詞/實體書"
};

locales.forEach(locale => {
  const filePath = path.join(localesDir, locale, 'translation.json');
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);

      // Navigate to userManual.security.mode.book.physical.title
      // Debug
      // console.log(`Keys in ${locale}:`, Object.keys(json));
      if (json.userManual && json.userManual.security) {
         const security = json.userManual.security;
         if (security.mode && security.mode.book && security.mode.book.physical) {
             security.mode.book.physical.title = translations[locale] || translations['en'];
             fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
             console.log(`Updated ${locale}`);
         } else {
             console.log(`Key userManual.security.mode.book.physical not found in ${locale}`);
         }
      } else {
        console.log(`Key userManual.security not found in ${locale}`);
      }
    } catch (e) {
      console.error(`Error processing ${locale}:`, e);
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
});
