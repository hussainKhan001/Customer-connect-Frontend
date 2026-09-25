import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* Who first worked on this owner — see backend/src/routes/customers.js's
   GET /:id/first-touch, sourced from the Audit Log's own earliest entry
   for this customer id. Returns null while loading, on a genuine "no
   record" (seeded/imported before audit logging existed), or on any
   fetch error — callers render nothing in all three cases rather than
   guessing at who it might have been. */
export function useFirstTouch(customerId) {
  const [firstTouch, setFirstTouch] = useState(null);

  useEffect(() => {
    setFirstTouch(null);
    if (!customerId) return undefined;
    let cancelled = false;
    apiFetch(`/api/customers/${customerId}/first-touch`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (!cancelled) setFirstTouch(body); })
      .catch(() => { if (!cancelled) setFirstTouch(null); });
    return () => { cancelled = true; };
  }, [customerId]);

  return firstTouch;
}
