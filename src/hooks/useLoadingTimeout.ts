import { useEffect, useState } from 'react';

export function useLoadingTimeout(loading: boolean, timeoutMs = 10_000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, timeoutMs]);

  return timedOut;
}
