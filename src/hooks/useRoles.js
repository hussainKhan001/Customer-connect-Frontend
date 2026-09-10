import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* Roles live in the database now (backend/src/models/Role.js), not in
   a constant — so every screen that shows a role, or lets someone pick
   one, has to read them from the API. Page-local rather than a
   context: the two screens that need roles (User management, Access &
   governance) both mount rarely and one of them is the only writer, so
   a shared cache would buy nothing but staleness. */
export function useRoles() {
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiFetch('/api/roles')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not load roles.');
        }
        return res.json();
      })
      .then((data) => { setRoles(data); setError(null); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  return { roles, error, reload: load, setRoles };
}
