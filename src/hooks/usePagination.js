import { useEffect, useMemo, useRef, useState } from 'react';

function readSavedPage(key) {
  try {
    const n = Number(sessionStorage.getItem(`page:${key}`));
    return n > 0 ? n : 1;
  } catch {
    return 1;
  }
}

/* Bounds how many rows a table actually renders at once — the fix for
   every list page that either silently truncated past some ROW_LIMIT
   (Owner Base) or rendered its full filtered result set into the DOM
   with no cap at all. `items` is expected already filtered/sorted;
   this only slices it into pages. `resetKey` — usually the active
   filters object/string — jumps back to page 1 when it changes, so a
   new filter never leaves the view stranded on a page that no longer
   has that many results.

   `persistKey`, when given, remembers the current page in
   sessionStorage and restores it on the next mount — the fix for
   "opening an owner and going back always lands on page 1 again",
   since <Routes> unmounts the whole list page on navigation and every
   piece of its state (including this hook's own) is normally lost with
   it. Only resets to 1 when `resetKey` actually changes from what was
   last seen — compared against a stored previous value rather than an
   "already ran once" flag, since StrictMode's dev-only double-invoke
   of effects on mount would otherwise consume a one-shot flag on its
   first pass and still fire the real reset on its second, clobbering
   a just-restored page straight back to 1 (only reproduces against the
   dev server, not a production build, which is what made it easy to
   miss testing this against a `vite build`). Comparing against a
   remembered previous value is idempotent no matter how many times
   the effect body runs for the same `resetKey`. */
export function usePagination(items, { pageSize = 50, resetKey, persistKey } = {}) {
  const [page, setPage] = useState(() => (persistKey ? readSavedPage(persistKey) : 1));
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      setPage(1);
    }
  }, [resetKey]);

  useEffect(() => {
    if (!persistKey) return;
    try { sessionStorage.setItem(`page:${persistKey}`, String(page)); } catch { /* ignore */ }
  }, [page, persistKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return { page: safePage, setPage, totalPages, pageItems, pageSize, total };
}
