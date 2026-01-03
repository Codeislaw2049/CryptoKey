const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const SOURCE_LANG = 'en';

function getDirectories(srcPath) {
  return fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
}

function deepMerge(source, target) {
  let modified = false;
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
        modified = true;
      }
      if (deepMerge(source[key], target[key])) {
        modified = true;
      }
    } else {
      if (target[key] === undefined) {
        target[key] = source[key]; // Copy English value
        modified = true;
      }
    }
  }
  return modified;
}

const languages = getDirectories(LOCALES_DIR);
const sourcePath = path.join(LOCALES_DIR, SOURCE_LANG, 'translation.json');

if (!fs.existsSync(sourcePath)) {
  console.error(`Source language file not found: ${sourcePath}`);
  process.exit(1);
}

const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

console.log(`Syncing from ${SOURCE_LANG} to ${languages.length - 1} other languages...`);

languages.forEach(lang => {
  if (lang === SOURCE_LANG) return;

  const targetPath = path.join(LOCALES_DIR, lang, 'translation.json');
  let targetContent = {};

  if (fs.existsSync(targetPath)) {
    try {
      targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing ${targetPath}: ${e.message}`);
      return;
    }
  } else {
    console.log(`Creating new file for ${lang}`);
  }

  const wasModified = deepMerge(sourceContent, targetContent);

  if (wasModified) {
    fs.writeFileSync(targetPath, JSON.stringify(targetContent, null, 2), 'utf8');
    console.log(`Updated ${lang}`);
  } else {
    console.log(`No changes needed for ${lang}`);
  }
});

console.log('Sync complete.');
