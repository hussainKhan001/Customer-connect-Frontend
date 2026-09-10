import { useEffect, useMemo, useState } from 'react';

/* Bounds how many rows a table actually renders at once — the fix for
   every list page that either silently truncated past some ROW_LIMIT
   (Owner Base) or rendered its full filtered result set into the DOM
   with no cap at all. `items` is expected already filtered/sorted;
   this only slices it into pages. `resetKey` — usually the active
   filters object/string — jumps back to page 1 when it changes, so a
   new filter never leaves the view stranded on a page that no longer
   has that many results. */
export function usePagination(items, { pageSize = 50, resetKey } = {}) {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [resetKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return { page: safePage, setPage, totalPages, pageItems, pageSize, total };
}
