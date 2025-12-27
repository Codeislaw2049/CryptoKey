import CryptoJS from 'crypto-js';
import { PRESET_BOOKS } from './publicBooks';

/**
 * Pure frontend cross-domain fetching of Gutenberg HTML content (Local parsing only)
 * @param url Gutenberg book HTML URL
 * @returns Parsed content and features
 */
export const fetchGutenbergContent = async (url: string): Promise<{
  pureText: string;
  textHash: string;
  fixedCharSegment: string;
  chapterHash: string;
}> => {
  // Validate URL
  if (!url.startsWith('http')) {
     throw new Error('Please enter a valid URL starting with http:// or https://');
  }
  
  // CORS Proxies Strategy
  // 1. Try AllOrigins (JSONP/Raw) - Best for Localhost Reliability (No CORS issues)
  // 2. Try Internal Cloudflare Proxy - Best for Production (Same Origin)
  // 3. Try other public proxies
  
  let html = '';
  let lastError = null;
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

  // 0. Priority for Offline/Local: Pre-downloaded "Offline Library"
  // If the requested URL matches one of our preset books, try to load the local .txt version first.
  if (isLocal) {
      const matchedBook = PRESET_BOOKS.find(b => b.url === url);
      if (matchedBook) {
          try {
              // Try to fetch from /books/[id].txt
              const localPath = `/books/${matchedBook.id}.txt`;
              console.log(`[Offline Strategy] Checking local library: ${localPath}`);
              
              const response = await fetch(localPath);
              if (response.ok) {
                  const text = await response.text();
                  if (text.length > 500) {
                      html = text;
                      console.log(`[Offline Strategy] Loaded ${matchedBook.id} from local library`);
                  }
              }
          } catch (e) {
              console.warn(`[Offline Strategy] Failed to load local book:`, e);
          }
      }
  }

  // 1. Priority for Localhost: AllOrigins (More reliable without CORS config on server)
  if (isLocal && !html) {
      try {
          // Use /raw for direct content, or /get for JSON wrapper
          // Let's try /get first as it handles encoding well
          const jsonProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
          console.log(`[Local Strategy] Trying AllOrigins JSON proxy: ${jsonProxy}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

          const response = await fetch(jsonProxy, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
              const data = await response.json();
              if (data.contents && data.contents.length > 500) {
                  html = data.contents;
                  console.log(`[Local Strategy] Success with AllOrigins JSON proxy`);
              }
          }
      } catch (e) {
          console.warn(`[Local Strategy] AllOrigins failed:`, e);
          lastError = e;
      }
  }

  // 2. Priority for Production (or Fallback for Local): Internal Cloudflare Proxy
  if (!html) {
      try {
          const baseUrl = isLocal ? 'https://cryptokey.im' : '';
          const internalProxy = `${baseUrl}/api/proxy?url=${encodeURIComponent(url)}`;
          
          console.log(`[Strategy] Trying internal proxy: ${internalProxy}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(internalProxy, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
              const text = await response.text();
              const isSpaFallback = text.includes('<title>CryptoKey.im') || text.includes('<!doctype html>');
              
              if (!isSpaFallback && text.length > 500 && !text.includes('Access Denied')) {
                  html = text;
                  console.log(`[Strategy] Success with internal proxy`);
              } else {
                 console.warn(`Internal proxy returned invalid content. Length: ${text.length}`);
              }
          }
      } catch (e) {
          console.warn(`Internal proxy failed:`, e);
          if (!isLocal) lastError = e; // Only record as main error if in production
      }
  }

  // 3. Fallback: AllOrigins (if not already tried in step 1)
  if (!html && !isLocal) {
       try {
          const jsonProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
          // ... (Existing AllOrigins logic for production fallback) ...
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(jsonProxy, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
              const data = await response.json();
              if (data.contents && data.contents.length > 500) html = data.contents;
          }
      } catch (e) { console.warn(e); }
  }

  // 3. Last Resort: Other public proxies
  if (!html) {
      const fallbackProxies = [
        (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        (target: string) => `https://thingproxy.freeboard.io/fetch/${target}`,
        (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
      ];

      for (const proxyGen of fallbackProxies) {
        try {
          const proxyUrl = proxyGen(url);
          console.log(`Trying fallback proxy: ${proxyUrl}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); 

          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            if (text.length > 500 && !text.includes('Access Denied')) {
                html = text;
                break;
            }
          }
        } catch (e) {
          console.warn(`Fallback proxy failed:`, e);
          lastError = e;
        }
      }
  }

  if (!html) {
    // If all proxies fail, throw a detailed error
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
    
    if (isLocalhost) {
         errorMsg = `Proxy Error: Failed to fetch book content via any available proxy (AllOrigins, CryptoKey.im). \n\nPlease ensure you are connected to the internet. \n\nTechnical Details: ${errorMsg}`;
     }

    throw new Error(errorMsg);
  }

  // Parse HTML/Text
  // 1. Remove scripts and styles (if HTML)
  const noScript = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                       .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
  
  // 2. Extract body or main content if possible, otherwise use whole html
  // Simple regex to strip tags
  const pureText = noScript
    .replace(/<[^>]*>/g, ' ') // Replace tags with space
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim();

  if (pureText.length < 500) { 
    throw new Error(`Content too short (${pureText.length} chars). First 50 chars: "${pureText.slice(0, 50)}..."`);
  }

  // Generate Features
  // 1. Text Hash (SHA256 of the entire pure text)
  const textHash = CryptoJS.SHA256(pureText).toString();

  // 2. Fixed Character Segment (e.g., chars 1000-2000)
  // We use a segment that is likely past the header metadata
  const start = Math.min(1000, pureText.length - 1000);
  const end = Math.min(start + 1000, pureText.length);
  const fixedCharSegment = pureText.slice(start, end);

  // 3. Chapter Structure Hash (Simplified: just length for now, or hash of first 100 chars of each 10k block)
  // Let's use a hash of a sampled subset to represent structure
  let structureSample = '';
  for(let i=0; i<pureText.length; i+=5000) {
      structureSample += pureText[i];
  }
  const chapterHash = CryptoJS.SHA256(structureSample).toString();

  return {
    pureText,
    textHash,
    fixedCharSegment,
    chapterHash
  };
};
