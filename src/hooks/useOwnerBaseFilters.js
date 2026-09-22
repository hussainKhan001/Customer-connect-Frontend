import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/* Owner Base's search/sort/filter state — page-local (nothing else
   reads it), so it lives here instead of AppContext. Seeds `seg` once
   from the URL's ?seg= query param on mount (written by
   useAppNavigation's openSegment) since <Routes> always mounts a
   fresh OwnerBase instance on navigation — no stale-seed edge case,
   no need to keep re-syncing from the URL afterward.

   Filters/search also survive that same remount via sessionStorage —
   opening an owner and clicking "Back to Owner Base" used to always
   land back with every filter and the search box cleared, same class
   of bug as the page/scroll position that usePagination and
   OwnerBase's own scroll-restore already fix, just for the filter bar
   instead of the table. An explicit ?seg= in the URL still wins over
   whatever was last saved — that's a fresh instruction from wherever
   the link came from (a segment tile elsewhere), not a stale one. */
const EMPTY = { seg: '', proj: '', unit: '', ent: '', q: '', status: '', gate: '', confMin: '', confMax: '' };
const STORAGE_KEY = 'ownerbase:filters';

function readSavedFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function useOwnerBaseFilters() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => {
    const urlSeg = searchParams.get('seg');
    /* a segment tile elsewhere is a deliberate "show me only this
       segment" instruction, same as it always was — it resets every
       other filter, it doesn't blend with whatever was last saved. */
    if (urlSeg) return { ...EMPTY, seg: urlSeg };
    return readSavedFilters() || { ...EMPTY };
  });
  const [sort, setSort] = useState({ k: '_total', dir: -1 });

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters]);

  /* `firstDir` is which way a column sorts the first time it's picked:
     a money/score column reads best highest-first, a name or unit
     number lowest-first. Clicking the same column again flips it. */
  const toggleSort = (k, firstDir = -1) =>
    setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: firstDir }));
  const clearFilters = () => setFilters({ ...EMPTY });

  return { filters, setFilters, sort, toggleSort, clearFilters };
}
