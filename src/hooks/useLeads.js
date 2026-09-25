import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';

/* Same page-local shape as useEvents.js/useRoles.js — the Leads page
   is the only screen that needs either list, so a shared context
   would buy nothing but staleness. Both lists live behind /api/leads
   (see backend/src/routes/leads.js); the webhook-facing writes
   (/api/webhooks/*) are a separate, API-key-authenticated router this
   hook never touches. */
export function useLeads() {
  const [leads, setLeads] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      apiFetch('/api/leads').then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not load leads.');
        return res.json();
      }),
      apiFetch('/api/leads/complaints').then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not load complaints.');
        return res.json();
      }),
    ])
      .then(([leadRows, complaintRows]) => {
        setLeads(leadRows);
        setComplaints(complaintRows);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  return { leads, complaints, error, reload: load, setLeads, setComplaints };
}
