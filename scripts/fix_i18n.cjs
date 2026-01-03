const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../public/locales');
console.log('Locales Dir:', LOCALES_DIR);

const TITLES = {
    'zh': '助记词/实体书',
    'zh-TW': '助記詞/實體書',
    'en': 'Mnemonic / Physical Book',
    'default': 'Mnemonic / Physical Book'
};

function updateFiles() {
    if (!fs.existsSync(LOCALES_DIR)) {
        console.error('Locales directory not found!');
        return;
    }

    const dirs = fs.readdirSync(LOCALES_DIR).filter(file => fs.statSync(path.join(LOCALES_DIR, file)).isDirectory());
    console.log('Found languages:', dirs);

    dirs.forEach(lang => {
        const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
        if (fs.existsSync(filePath)) {
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Ensure structure
                if (!content.decryption) content.decryption = {};
                if (!content.decryption.mode) content.decryption.mode = {};
                
                let newTitle = TITLES['default'];
                if (lang === 'zh') newTitle = TITLES['zh'];
                if (lang === 'zh-TW') newTitle = TITLES['zh-TW'];
                // For others, keep English default or if we want to be safe, prepend Mnemonic?
                // User asked to "modify the translation key".
                
                console.log(`Updating ${lang} key 'decryption.mode.physicalBook' to: ${newTitle}`);
                content.decryption.mode.physicalBook = newTitle;
                
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            } catch (e) {
                console.error(`Error processing ${lang}:`, e);
            }
        } else {
            console.warn(`File not found: ${filePath}`);
        }
    });
}

updateFiles();
