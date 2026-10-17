import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* Same page-local shape as useEvents.js — the Leads page (all of them,
   for the Unmatched-complaints queue) and Customer Master's
   Relationship tab (one owner's own, filtered client-side) both mount
   rarely, so a shared context would buy nothing but staleness.
   Deliberately separate from Customer.complaints/openComplaints (see
   models/ExternalComplaint.js) — matching by contact number links a
   complaint to an owner, it never merges into that narrower, Trust-
   score-feeding workflow. */
export function useExternalComplaints() {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiFetch('/api/leads/complaints')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not load complaints.');
        }
        return res.json();
      })
      .then((data) => { setComplaints(data); setError(null); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  return { complaints, error, reload: load, setComplaints };
}
