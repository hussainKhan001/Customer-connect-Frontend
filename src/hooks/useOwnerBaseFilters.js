import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/* Owner Base's search/sort/filter state — page-local (nothing else
   reads it), so it lives here instead of AppContext. Seeds `seg` once
   from the URL's ?seg= query param on mount (written by
   useAppNavigation's openSegment) since <Routes> always mounts a
   fresh OwnerBase instance on navigation — no stale-seed edge case,
   no need to keep re-syncing from the URL afterward. */
const EMPTY = { seg: '', proj: '', unit: '', ent: '', q: '', status: '', gate: '' };

export function useOwnerBaseFilters() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...EMPTY, seg: searchParams.get('seg') || '' }));
  const [sort, setSort] = useState({ k: '_total', dir: -1 });

  /* `firstDir` is which way a column sorts the first time it's picked:
     a money/score column reads best highest-first, a name or unit
     number lowest-first. Clicking the same column again flips it. */
  const toggleSort = (k, firstDir = -1) =>
    setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: firstDir }));
  const clearFilters = () => setFilters({ ...EMPTY });

  return { filters, setFilters, sort, toggleSort, clearFilters };
}
