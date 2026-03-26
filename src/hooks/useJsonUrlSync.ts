import { useState, useCallback, useEffect } from 'react';

// Sync Editor content via Base64 URL parameter
export const useJsonUrlSync = (initialValue: string) => {
  const [data, setData] = useState<string>(() => {
    // Attempt decoding hash on mount
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        return decodeURIComponent(atob(hash));
      } catch (e) {
        console.error('Failed to decode hash param');
      }
    }
    return initialValue;
  });

  const updateData = useCallback((newData: string) => {
    setData(newData);
    // Debounce pushing to URL to prevent history clutter/lag
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!data) {
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      // Encode safely for large strings? (Note base64 of 5MB is huge, URL limits might break. Only do it if under 100kb usually. 
      // Let's cap URL sync to 100kb to prevent URL length crashes
      if (data.length < 100000) {
        const hash = btoa(encodeURIComponent(data));
        window.history.replaceState(null, '', `#${hash}`);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [data]);

  return [data, updateData] as const;
};
