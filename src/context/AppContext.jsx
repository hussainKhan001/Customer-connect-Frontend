/* =====================================================================
   APP STATE — one store for the whole system. The raw base is fetched
   from the API into state; every derived field is recomputed by
   enrich() whenever the base or the weights change, so moving a weight
   redraws the segments everywhere at once — purely client-side, no
   round trip to the server.
   ===================================================================== */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { enrich } from '../utils/derived.js';
import { DEFAULT_W } from '../constants/segments.js';
import { PROJECTS as DEFAULT_PROJECTS } from '../constants/projects.js';
import { OCC as DEFAULT_OCC, COMM as DEFAULT_COMM } from '../constants/seedData.js';
import { apiFetch, API_BASE } from '../utils/api.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

/* Fallbacks for the brief window before the first /api/settings
   response lands (or if it never does) — every dropdown that used to
   read a hardcoded constants/*.js list directly now reads
   useApp().masterData instead, so there always has to be SOMETHING
   here, the same "never an undefined mid-fetch flash" guarantee
   fetchSettings already gives the company-letterhead fields. These
   mirror the Settings schema's own defaults (models/Settings.js) —
   once that document exists server-side (it always does after the
   very first boot), these never actually get used. Relations/property
   types/call outcomes never had a constants/*.js home before — they
   were inline arrays inside the one modal that used each — so they're
   defined here instead of inventing a new file for four short lists. */
const DEFAULT_RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child'];
const DEFAULT_PROPERTY_TYPES = ['Villa', 'Plot', 'Flat'];
const DEFAULT_FLAT_CONFIGS = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK'];
const DEFAULT_VILLA_CONFIGS = ['2BHK', '3BHK', '4BHK'];
const DEFAULT_CALL_OUTCOMES = ['Interested — follow up', 'Not interested', 'No answer', 'Call back later', 'Converted — re-invested'];

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [live, setLive] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_W);
  const [settings, setSettings] = useState(null);

  const fetchCustomers = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return apiFetch('/api/customers')
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then((data) => { setRaw(data); setLoadError(null); })
      .catch((err) => { if (!silent) setLoadError(err.message); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  /* nothing to fetch (and no point holding a live socket open) until
     there's a signed-in session — see AuthContext.jsx */
  useEffect(() => {
    if (user) fetchCustomers();
    else setLoading(false);
  }, [user, fetchCustomers]);

  /* company/system settings (letterhead identity, etc.) — readable by
     anyone signed in, see backend/src/routes/settings.js. Falls back
     to the schema's own defaults (already present in the GET response
     even before anyone edits them) so every consumer always has real
     values to render, never an undefined mid-fetch flash. */
  const fetchSettings = useCallback(() => {
    apiFetch('/api/settings').then((r) => r.ok && r.json()).then((data) => data && setSettings(data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (user) fetchSettings();
  }, [user, fetchSettings]);

  /* every dropdown that used to import a hardcoded constants/*.js list
     now reads this instead — falls back to this module's own DEFAULT_*
     constants field-by-field (not "use the fallback object wholesale
     until settings loads") so a Settings document that's missing just
     one newer field (an older document, from before some field was
     added) still serves real data for everything else instead of
     falling back to nothing. `entities` is derived from `projects`
     rather than stored on its own, same as the old constants/
     projects.js ENTITIES export was. */
  const masterData = useMemo(() => {
    const projects = settings?.projects?.length ? settings.projects : DEFAULT_PROJECTS;
    return {
      projects,
      entities: [...new Set(projects.map((p) => p.entity))],
      occupations: settings?.occupations?.length ? settings.occupations : DEFAULT_OCC,
      communities: settings?.communities?.length ? settings.communities : DEFAULT_COMM.filter((x) => x !== 'Other'),
      relations: settings?.relations?.length ? settings.relations : DEFAULT_RELATIONS,
      propertyTypes: settings?.propertyTypes?.length ? settings.propertyTypes : DEFAULT_PROPERTY_TYPES,
      flatConfigs: settings?.flatConfigs?.length ? settings.flatConfigs : DEFAULT_FLAT_CONFIGS,
      villaConfigs: settings?.villaConfigs?.length ? settings.villaConfigs : DEFAULT_VILLA_CONFIGS,
      callOutcomes: settings?.callOutcomes?.length ? settings.callOutcomes : DEFAULT_CALL_OUTCOMES,
      /* deliberately NO hardcoded fallback here, unlike every other
         field above — Master Data's Document Templates editor is the
         one true source for which document types exist per property
         type, full stop. A silent client-side default would let a
         type an admin genuinely emptied out (or never configured)
         quietly reappear with entries nobody asked for; better to
         show nothing in the Document Vault than something Master Data
         doesn't actually say. A Mongoose Map serialises to a plain
         object over JSON. */
      documentTemplates: settings?.documentTemplates || {},
    };
  }, [settings]);

  const updateSettings = useCallback(async (patch) => {
    const res = await apiFetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(body.error || 'Update failed');
      err.errors = body.errors || {};
      throw err;
    }
    setSettings(body);
    return body;
  }, []);

  /* live sync: MongoDB Change Streams (see backend/src/index.js) push a
     'customers:changed' event on every insert/update/delete — whether
     it came from this app, a teammate's tab, or someone editing
     directly in Compass. Debounced because a seed run fires one event
     per document, and a single refetch covers all of them. */
  const refetchTimer = useRef(null);
  useEffect(() => {
    if (!user) return undefined;
    const socket = io(API_BASE || undefined, { transports: ['websocket', 'polling'], withCredentials: true });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('customers:changed', () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => fetchCustomers({ silent: true }), 400);
    });
    socket.on('settings:changed', () => fetchSettings());
    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [user, fetchCustomers, fetchSettings]);

  /* "shell" records (see backend/src/lib/validateIncomplete.js) have no
     PAN and/or no confirmed unit financials. They used to be held out
     of the scored owner base entirely; enrich()/unitCalc()/score() are
     now null-safe (a unit with no confirmed area/rate/consideration
     contributes 0 gain/value rather than a misleading negative number),
     so every record goes straight into `base` — nothing sits in a
     separate holding queue waiting to be "completed" first.
     incompleteRecords still identifies which ones are missing PAN/
     financials, for the Incomplete Records page's own reference view. */
  const incompleteRecords = useMemo(() => raw.filter((c) => c.incomplete), [raw]);

  /* the only expensive computation in the app — memoised on its inputs */
  const base = useMemo(() => enrich(raw, weights), [raw, weights]);
  const byId = useCallback((id) => base.find((c) => c.id === id), [base]);

  /* the create routes now fold a new booking into an existing owner
     (same name + mobile) instead of always minting a new Customer
     document — see mergeIntoExistingOwner in backend/src/routes/
     customers.js. `body` then carries an id already present in `raw`
     (with `merged: true`), and belongs in place of that entry, not
     prepended as a second copy of the same owner. */
  const upsertRaw = useCallback((body) => {
    setRaw((prev) => {
      const idx = prev.findIndex((c) => c.id === body.id);
      if (idx === -1) return [body, ...prev];
      const next = [...prev];
      next[idx] = body;
      return next;
    });
  }, []);

  /* posts to the real API; the new record is scored and gated on the
     next render like any other once it lands in `raw`. Throws with a
     `.errors` field-map on validation failure (400), for the Intake
     form to merge into its own error state. */
  const addCustomer = useCallback(async (draft) => {
    const res = await apiFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error('Validation failed');
      err.errors = body.errors || {};
      throw err;
    }
    upsertRaw(body);
    return body;
  }, [upsertRaw]);

  /* same shape as addCustomer, but for a raw-allotment-list "shell"
     record — only name/mobile/project/unit required. See
     backend/src/lib/validateIncomplete.js. */
  const addIncompleteCustomer = useCallback(async (draft) => {
    const res = await apiFetch('/api/customers/incomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error('Validation failed');
      err.errors = body.errors || {};
      throw err;
    }
    upsertRaw(body);
    return body;
  }, [upsertRaw]);

  /* replaces one record in `raw` with the server's latest copy of it —
     used after a write that targets a single customer (e.g. logging a
     sent statement) so the UI reflects it without a full refetch */
  const patchCustomer = useCallback((updated) => {
    setRaw((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  /* the "complete profile" form — PATCHes only the fields the caller
     changed. Throws with a `.errors` field-map on validation/permission
     failure, same convention as addCustomer, for the modal to surface. */
  const updateProfile = useCallback(async (id, patch) => {
    const res = await apiFetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(body.error || 'Update failed');
      err.errors = body.errors || {};
      throw err;
    }
    patchCustomer(body);
    return body;
  }, [patchCustomer]);

  /* generic mutation helper for the operational-write endpoints (status,
     litigation, complaints, loan, valuation, nps, referrals, events,
     site visits, exit, complete, calls, milestones, permissions) — same
     fetch/error/patchCustomer shape as updateProfile, exposed once so
     each new modal/inline action calls its own endpoint path directly
     instead of the context growing one near-identical named wrapper
     per action. */
  const mutateCustomer = useCallback(async (path, body = {}, method = 'PATCH') => {
    const res = await apiFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseBody = await res.json();
    if (!res.ok) {
      const err = new Error(responseBody.error || 'Request failed');
      err.errors = responseBody.errors || {};
      throw err;
    }
    patchCustomer(responseBody);
    return responseBody;
  }, [patchCustomer]);

  /* removes one owner permanently. Drops it from `raw` immediately
     rather than waiting for the Change Stream refetch, so the row
     disappears the moment the confirm is accepted. */
  const deleteCustomer = useCallback(async (id) => {
    const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    setRaw((prev) => prev.filter((c) => c.id !== id));
    return body;
  }, []);

  /* wipes every customer record — the same operation the one-off
     migration scripts were doing by hand all session, now a real
     button (see UserManagement.jsx). Doesn't call patchCustomer since
     there's no single updated record to fold back in; the realtime
     Change Stream listener picks up the resulting empty collection
     and refetches on its own, same as any other write. */
  const deleteAllCustomers = useCallback(async () => {
    const res = await apiFetch('/api/customers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE ALL CUSTOMERS' }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    setRaw([]);
    return body;
  }, []);

  const value = {
    base, byId, raw, incompleteRecords,
    loading, loadError, live,
    weights, setWeights,
    settings, updateSettings, masterData,
    addCustomer, addIncompleteCustomer, patchCustomer, updateProfile, mutateCustomer,
    deleteCustomer, deleteAllCustomers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
