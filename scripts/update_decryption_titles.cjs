const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../public/locales');

const TITLES = {
    'zh': '助记词/实体书',
    'en': 'Mnemonic / Physical Book',
    'default': 'Mnemonic / Physical Book'
};

function updateFiles() {
    const dirs = fs.readdirSync(LOCALES_DIR).filter(file => fs.statSync(path.join(LOCALES_DIR, file)).isDirectory());

    dirs.forEach(lang => {
        const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
        if (fs.existsSync(filePath)) {
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Ensure structure exists
                if (!content.decryption) content.decryption = {};
                if (!content.decryption.mode) content.decryption.mode = {};

                // Update title
                const newTitle = TITLES[lang] || TITLES['default'];
                console.log(`Updating ${lang}: ${content.decryption.mode.physicalBook} -> ${newTitle}`);
                content.decryption.mode.physicalBook = newTitle;

                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            } catch (e) {
                console.error(`Error updating ${lang}:`, e);
            }
        }
    });
}

updateFiles();
