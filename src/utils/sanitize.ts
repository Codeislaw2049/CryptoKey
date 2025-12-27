import DOMPurify from 'dompurify';

/**
 * Sanitizes user input strings to prevent XSS attacks.
 * This is crucial for data that might be rendered into the DOM or used in sensitive contexts.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
  });
};

/**
 * Sanitizes URLs to prevent javascript: pseudo-protocol attacks.
 */
export const sanitizeUrl = (url: string): string => {
    if (!url) return url;
    const sanitized = DOMPurify.sanitize(url, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
    
    // Explicitly check for javascript: protocol
    if (sanitized.toLowerCase().startsWith('javascript:')) {
        return '';
    }
    
    return sanitized;
};
