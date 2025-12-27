import { useState, useEffect, useRef } from 'react';

/**
 * Hook to securely handle sensitive data.
 * Attempts to clear data from memory when component unmounts.
 * Note: In JS/React, we cannot guarantee true memory erasure due to GC,
 * but this minimizes the window of exposure in the React state tree.
 */
export function useSecureMemory<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (typeof stateRef.current === 'string') {
        // @ts-ignore
        stateRef.current = ''; 
      } else if (Array.isArray(stateRef.current)) {
        // @ts-ignore
        stateRef.current.length = 0;
      } else if (typeof stateRef.current === 'object' && stateRef.current !== null) {
        try {
          Object.keys(stateRef.current).forEach(key => {
            // @ts-ignore
            stateRef.current[key] = null;
          });
        } catch (e) {
          // Ignore if immutable or sealed
        }
      }
      // Note: We don't call setState here because the component is unmounting.
    };
  }, []);

  return [state, setState];
}

