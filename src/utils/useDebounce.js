// ── DEBOUNCE HOOK — prevents excessive re-renders on search input ────
// Usage: const debouncedSearch = useDebounce(search, 300);
//        Then filter using debouncedSearch instead of search

import { useState, useEffect } from "react";

export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
