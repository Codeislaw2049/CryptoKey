const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');
const langs = fs.readdirSync(localesDir);

const translations = {
    'zh': '助记词/实体书',
    'zh-TW': '助記詞/實體書',
    'en': 'Mnemonic / Physical Book',
    'ja': 'ニーモニック / 実体書籍',
    'ko': '니모닉 / 실물 서적',
    'fr': 'Mnémonique / Livre Physique',
    'de': 'Mnemonik / Physisches Buch',
    'es': 'Mnemónico / Libro Físico',
    'vi': 'Gợi nhớ / Sách Vật lý',
    'tr': 'Anımsatıcı / Fiziksel Kitap',
    'pt': 'Mnemônico / Livro Físico',
    'id': 'Mnemonic / Buku Fisik',
    'hi': 'स्मृति सहायक / भौतिक पुस्तक',
    'ru': 'Мнемоника / Физическая книга'
};

langs.forEach(lang => {
    const filePath = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(content);
            
            if (json.decryption && json.decryption.mode) {
                // Determine value
                let newValue = translations[lang] || translations['en'];
                
                json.decryption.mode.physicalBook = newValue;
                
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
                console.log(`Updated ${lang} with "${newValue}"`);
            } else {
                console.log(`Skipped ${lang} (structure mismatch)`);
            }
        } catch (e) {
            console.error(`Error processing ${lang}:`, e);
        }
    }
});
