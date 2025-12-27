
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRESET_BOOKS = [
  { id: 'PG1', url: 'https://www.gutenberg.org/cache/epub/1404/pg1404-images.html' },
  { id: 'PG2', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' },
  { id: 'PG3', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html#constitution' },
  { id: 'PG4', url: 'https://www.gutenberg.org/cache/epub/12/pg12-images.html' },
  { id: 'PG5', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG6', url: 'https://www.gutenberg.org/cache/epub/1/pg1-images.html' },
  { id: 'PG7', url: 'https://www.gutenberg.org/cache/epub/8001/pg8001-images.html' },
  { id: 'PG8', url: 'https://www.gutenberg.org/cache/epub/104/pg104-images.html' },
  { id: 'PG9', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG10', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' },
  { id: 'PG11', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG12', url: 'https://www.gutenberg.org/cache/epub/1404/pg1404-images.html' },
  { id: 'PG13', url: 'https://www.gutenberg.org/cache/epub/100/pg100-images.html' },
  { id: 'PG14', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG15', url: 'https://www.gutenberg.org/cache/epub/1/pg1-images.html' },
  { id: 'PG16', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG17', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG18', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG19', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG20', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG21', url: 'https://www.gutenberg.org/cache/epub/21/pg21-images.html' },
  { id: 'PG22', url: 'https://www.gutenberg.org/cache/epub/10681/pg10681-images.html' },
  { id: 'PG23', url: 'https://www.gutenberg.org/cache/epub/19/pg19-images.html' },
  { id: 'PG24', url: 'https://www.gutenberg.org/cache/epub/1001/pg1001-images.html' },
  { id: 'PG25', url: 'https://www.gutenberg.org/cache/epub/3300/pg3300-images.html' },
  { id: 'PG26', url: 'https://www.gutenberg.org/cache/epub/20/pg20-images.html' },
  { id: 'PG27', url: 'https://www.gutenberg.org/cache/epub/107/pg107-images.html' },
  { id: 'PG28', url: 'https://www.gutenberg.org/cache/epub/11339/pg11339-images.html' },
  { id: 'PG29', url: 'https://www.gutenberg.org/cache/epub/109/pg109-images.html' },
  { id: 'PG30', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' }
];

const OUTPUT_DIR = path.resolve(__dirname, '../public/books');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const processContent = (html) => {
  const noScript = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                       .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
  
  const pureText = noScript
    .replace(/<[^>]*>/g, ' ') // Replace tags with space
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim();
    
  return pureText;
};

const fetchBook = async (book) => {
  try {
    console.log(`Fetching ${book.id}: ${book.url}`);
    const response = await fetch(book.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const pureText = processContent(html);
    
    if (pureText.length < 500) {
        throw new Error('Content too short');
    }
    
    const outputPath = path.join(OUTPUT_DIR, `${book.id}.txt`);
    fs.writeFileSync(outputPath, pureText, 'utf-8');
    console.log(`Saved ${book.id} (${pureText.length} chars)`);
    return true;
  } catch (e) {
    console.error(`Failed ${book.id}:`, e.message);
    return false;
  }
};

(async () => {
  for (const book of PRESET_BOOKS) {
    await fetchBook(book);
    // Be polite
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('Done.');
})();
