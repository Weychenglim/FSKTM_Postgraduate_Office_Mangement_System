import { useCallback, useEffect, useRef, useState } from 'react';

/** Independent read state: a failed widget must not leave its neighbours loading. */
export function useOfficeRead<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setError(null);
    try { const result = await read(); if (generation.current === version) setData(result); }
    catch (failure) { if (generation.current === version) setError(failure instanceof Error ? failure.message : 'Unable to load these records.'); }
    finally { if (generation.current === version) setLoading(false); }
  }, [read]);
  useEffect(() => { void reload(); return () => { generation.current += 1; }; }, [reload]);
  return { data, loading, error, reload };
}
