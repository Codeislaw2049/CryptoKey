import { useState, useEffect } from 'react';

export const useGeoLocation = () => {
  const [isChina, setIsChina] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkLocation = async () => {
      try {
        // Use relative path for production (same domain) to avoid CORS
        // Use absolute for localhost (might hit CORS but usually allows simple GET or we can use a proxy)
        const url = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
          ? 'https://www.cloudflare.com/cdn-cgi/trace'
          : '/cdn-cgi/trace';

        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          // Parse "loc=XX"
          const match = text.match(/loc=([A-Z]+)/);
          if (match && match[1] === 'CN') {
            setIsChina(true);
          }
        }
      } catch (error) {
        // Silent failure for geo check is fine, defaults to Global
        // console.warn('Geo check skipped/failed');
      } finally {
        setLoading(false);
      }
    };

    checkLocation();
  }, []);

  return { isChina, loading };
};
