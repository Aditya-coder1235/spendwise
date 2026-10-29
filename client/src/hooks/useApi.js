import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small data-fetching hook used across pages. Dependencies are supplied
 * explicitly (similar to useEffect) and refetch is stable.
 */
export function useApi(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options;
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: initialData,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState((previous) => ({ ...previous, loading: false }));
      return undefined;
    }
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) {
          setState((previous) => ({ ...previous, loading: false, error }));
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, enabled]);

  const refetch = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, refetch, setData: (data) => setState((previous) => ({ ...previous, data })) };
}
