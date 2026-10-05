import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* One owner's family group, if they're in one — null groupId is the
   overwhelming majority case (no family group at all), so this is a
   no-op until CustomerMaster actually hands it a real id. The MEMBER
   list and unit rollup aren't fetched here — they're computed straight
   off useApp().base (already loaded) by the caller, filtered on
   familyGroupId, so this hook only owns the group's own name/notes. */
export function useFamilyGroup(groupId) {
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!groupId) { setGroup(null); setError(null); return; }
    apiFetch(`/api/family-groups/${groupId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not load the family group.');
        return res.json();
      })
      .then((data) => { setGroup(data); setError(null); })
      .catch((err) => setError(err.message));
  }, [groupId]);

  useEffect(load, [load]);

  return { group, error, reload: load };
}
