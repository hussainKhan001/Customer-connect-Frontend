import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* Same page-local shape as useRoles.js — the two screens that need the
   event list (the Events module itself, and Customer Master's Invite
   list drawer) both mount rarely, so a shared context would buy
   nothing but staleness. */
export function useEvents() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiFetch('/api/events')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not load events.');
        }
        return res.json();
      })
      .then((data) => { setEvents(data); setError(null); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  return { events, error, reload: load, setEvents };
}
