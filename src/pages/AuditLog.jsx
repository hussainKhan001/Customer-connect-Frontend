import { useEffect, useMemo, useState } from 'react';
import {
  History, Search, UserSearch, ChevronRight as ChevronRightIcon, AlertTriangle, Check,
  Plus, Pencil, Trash2, LogIn, Copy, SlidersHorizontal,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { Card, Chip, Banner, TableWrap, EmptyState, Pagination, Avatar, Dot, Row, KV, btnGhost, tableIconBtnCls, th, td } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import { apiFetch } from '../utils/api.js';
import { fmtDT } from '../utils/core.js';
import { toast } from '../utils/toast.js';

const tabCls = (on) =>
  `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
    on
      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

/* one visual language for "what kind of write was this" everywhere a
   method shows up — a color AND an icon, since the color alone reads
   as decoration at a glance but the pairing reads as a type. */
const METHOD_STYLE = {
  POST: { tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Plus, iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' },
  PATCH: { tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Pencil, iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300' },
  PUT: { tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Pencil, iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300' },
  DELETE: { tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: Trash2, iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' },
};
const DEFAULT_METHOD_STYLE = { tone: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: LogIn, iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300' };

const MethodBadge = ({ method }) => {
  const s = METHOD_STYLE[method] || DEFAULT_METHOD_STYLE;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 ${s.iconBg}`} title={method}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
};
const MethodChip = ({ method }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${(METHOD_STYLE[method] || DEFAULT_METHOD_STYLE).tone}`}>
    {method}
  </span>
);

/* a resource reads faster with a stable colour of its own than as the
   same grey pill as everything else — new resources this doesn't know
   about yet just fall back to that grey, never broken. */
const RESOURCE_TONE = {
  customers: 'B', users: 'D', roles: 'D', settings: 'm', events: 'A',
  leads: 'A', familyGroups: 'g', webhooks: 'w', auth: 'C',
};

const METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'POST', label: 'POST (create)' },
  { value: 'PATCH', label: 'PATCH (update)' },
  { value: 'PUT', label: 'PUT (update)' },
  { value: 'DELETE', label: 'DELETE' },
];
const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'true', label: 'Succeeded' },
  { value: 'false', label: 'Failed' },
];
const RESOLVED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Unresolved' },
  { value: 'true', label: 'Resolved' },
];

const dateInputCls = 'px-2.5 py-2 h-10 border rounded-lg shadow-2xs text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600';

/* shared shell every filter row sits in — a defined "toolbar" strip
   instead of controls floating directly on the page background, so
   the eye reads it as one control surface rather than loose inputs. */
const FilterBar = ({ children, hasFilters, onClear }) => (
  <div className="flex flex-wrap items-center gap-2.5 p-3 mb-4 rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/40 backdrop-blur-sm">
    <SlidersHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-0.5" />
    {children}
    <div className="flex-1" />
    {hasFilters && (
      <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={onClear}>Clear filters</button>
    )}
  </div>
);

/* "id", "newUnit", "property_type" → "Id", "New unit", "Property type"
   — a label a reader parses in one pass, not a raw field name they
   have to mentally de-camelCase every time. */
const prettyKey = (k) =>
  k.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/* a nested object/array (e.g. a "consent" sub-document) is rare in
   these payloads and doesn't collapse into one readable line, so it
   falls back to compact inline JSON rather than forcing every value
   in the app to render the same way. Everything else — the overwhelming
   majority of fields here — reads as plain text, a Yes/No, or the
   same muted "not captured" treatment the rest of the app already
   uses for a blank value, instead of JSON's quotes-and-commas noise. */
const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return <span className="italic text-gray-400 dark:text-gray-500">not captured</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return <span className="font-mono text-[11px]">{JSON.stringify(v)}</span>;
  return String(v);
};

/* splits the raw {params, body} blob into two labelled, independently
   readable blocks instead of one undifferentiated JSON dump — params
   (what the URL targeted) and body (what was sent) answer different
   questions and read better apart, each as a plain field: value list.
   Only renders the ones that actually have content. */
const DetailBlock = ({ label, value }) => {
  const entries = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : null;
  if (!entries || entries.length === 0) return null;
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">{label}</div>
      <div className="rounded-lg border border-gray-100 dark:border-gray-700/60 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-3 py-2 text-xs bg-white dark:bg-gray-800">
            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{prettyKey(k)}</span>
            <span className="text-gray-800 dark:text-gray-100 font-semibold text-right break-all">{formatValue(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied', label);
  } catch {
    toast.error('Could not copy', 'Your browser blocked clipboard access.');
  }
};

/* the table is a single dense row per event on purpose — the full
   request detail (params/body, or a stack trace) belongs in a drawer
   over the page, not stretching the row it came from, which is the
   only thing on this page worth looking at as a table in the first
   place. */
function ActivityDetailDrawer({ entry: e, onClose }) {
  return (
    <Modal
      drawer
      drawerWidth="sm:w-[640px]"
      title={`${e.method} ${e.resource}`}
      subtitle={fmtDT(e.at)}
      onClose={onClose}
      footer={<button className={btnGhost} onClick={onClose}>Close</button>}
    >
      <KV>
        <Row k="When" v={fmtDT(e.at)} />
        <Row k="Who" v={e.actor ? `${e.actor.name} · ${e.actor.email} · ${e.actor.role}` : 'Not signed in'} />
        <Row k="Action" v={<span className="font-mono text-xs">{e.method} {e.path}</span>} />
        <Row k="Resource" v={<Chip cls={RESOURCE_TONE[e.resource] || 'm'}>{e.resource}</Chip>} />
        <Row k="Outcome" v={<span className={`font-bold tabular-nums ${e.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{e.statusCode}</span>} />
        <Row k="IP address" v={<span className="font-mono text-xs">{e.ip || '—'}</span>} />
      </KV>
      <div className="mt-4">
        {!e.params && !e.body ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic">No request parameters or body recorded for this event.</div>
        ) : (
          <div className="space-y-3">
            <DetailBlock label="Params" value={e.params} />
            <DetailBlock label="Body" value={e.body} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ErrorDetailDrawer({ entry: e, onClose, onToggleResolved, busy }) {
  return (
    <Modal
      drawer
      drawerWidth="sm:w-[640px]"
      title={e.message}
      subtitle={fmtDT(e.at)}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose}>Close</button>
          <button
            className={`${btnGhost} inline-flex items-center gap-1.5 ${e.resolved ? '' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}
            onClick={() => onToggleResolved(e)}
            disabled={busy}
          >
            <Check className="w-4 h-4" /> {e.resolved ? 'Mark unresolved' : 'Mark resolved'}
          </button>
        </>
      }
    >
      <KV>
        <Row k="When" v={fmtDT(e.at)} />
        <Row k="Where" v={<span className="font-mono text-xs">{e.method ? `${e.method} ` : ''}{e.path || '—'}</span>} />
        <Row k="Who" v={e.actor ? e.actor.name : 'Not signed in'} />
        <Row
          k="Reference"
          v={e.correlationId ? (
            <button
              className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary-600 dark:hover:text-primary-400"
              onClick={() => copyToClipboard(e.correlationId, 'Correlation ID copied to clipboard.')}
              title="Copy correlation ID"
            >
              {e.correlationId} <Copy className="w-3 h-3" />
            </button>
          ) : '—'}
        />
        <Row k="Status" v={
          <span className="inline-flex items-center">
            <Dot tone={e.resolved ? 'g' : 'r'} />
            <span className={`text-xs font-bold uppercase tracking-wide ${e.resolved ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {e.resolved ? 'Resolved' : 'Unresolved'}
            </span>
          </span>
        } />
      </KV>
      <div className="mt-4">
        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Stack trace</div>
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-gray-600 dark:text-gray-300 m-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 p-2.5">{e.stack || e.message}</pre>
      </div>
    </Modal>
  );
}

/* Every create/update/delete the API has ever handled — written by the
   backend's auditRoute() middleware (see backend/src/lib/auditLog.js),
   mounted on every resource router, not hand-logged per action. This
   page is purely a read-only viewer onto that trail; the "action"
   itself already happened by the time a row exists here. */
function ActivityTab() {
  const [resource, setResource] = useState('');
  const [method, setMethod] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actorInput, setActorInput] = useState('');
  const [actor, setActor] = useState('');
  /* the one owner's full history across every actor who ever touched
     them — the same `params.id` filter Customer Master's own embedded
     Audit log tab scopes to, just exposed here so "who all has worked
     on NEO-C-946" is a search box instead of only reachable from that
     one owner's own page. */
  const [recordIdInput, setRecordIdInput] = useState('');
  const [recordId, setRecordId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);

  /* debounce the free-text searches only — every other filter is a
     dropdown/date picker, where each change is already a single
     deliberate action worth an immediate refetch */
  useEffect(() => {
    const t = setTimeout(() => setActor(actorInput.trim()), 400);
    return () => clearTimeout(t);
  }, [actorInput]);

  useEffect(() => {
    const t = setTimeout(() => setRecordId(recordIdInput.trim()), 400);
    return () => clearTimeout(t);
  }, [recordIdInput]);

  useEffect(() => { setPage(1); }, [resource, method, outcome, actor, recordId, from, to]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (resource) params.set('resource', resource);
    if (method) params.set('method', method);
    if (outcome) params.set('ok', outcome);
    if (actor) params.set('actor', actor);
    if (recordId) params.set('recordId', recordId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));

    let cancelled = false;
    apiFetch(`/api/audit-logs?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(res.status === 403 ? 'Your role does not have access to the audit log.' : body.error || 'Could not load the audit log.');
        }
        return res.json();
      })
      .then((body) => { if (!cancelled) { setData(body); setLoadError(null); } })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [resource, method, outcome, actor, recordId, from, to, page]);

  const resourceOptions = useMemo(
    () => [{ value: '', label: 'All resources' }, ...((data?.resources || []).map((r) => ({ value: r, label: r })))],
    [data?.resources]
  );

  const hasFilters = resource || method || outcome || actor || recordId || from || to;
  const clearFilters = () => {
    setResource(''); setMethod(''); setOutcome('');
    setActorInput(''); setActor('');
    setRecordIdInput(''); setRecordId('');
    setFrom(''); setTo('');
  };

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  const entries = data?.entries || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <FilterBar hasFilters={hasFilters} onClear={clearFilters}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={actorInput}
            onChange={(e) => setActorInput(e.target.value)}
            placeholder="Search by name or email"
            className="pl-8 pr-3 py-2 h-10 border rounded-lg shadow-2xs text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-56"
          />
        </div>
        <div className="relative">
          <UserSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={recordIdInput}
            onChange={(e) => setRecordIdInput(e.target.value)}
            placeholder="Owner ID — e.g. NEO-C-946"
            title="Show everyone who's touched this one owner's record"
            className="pl-8 pr-3 py-2 h-10 border rounded-lg shadow-2xs text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-48"
          />
        </div>
        <ThemedSelect className="w-40" value={resource} onChange={setResource} options={resourceOptions} placeholder="All resources" />
        <ThemedSelect className="w-44" value={method} onChange={setMethod} options={METHOD_OPTIONS} placeholder="All methods" />
        <ThemedSelect className="w-40" value={outcome} onChange={setOutcome} options={OUTCOME_OPTIONS} placeholder="All outcomes" />
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInputCls} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInputCls} />
        </div>
      </FilterBar>

      <Card title="Audit log" hint={data ? `${data.total.toLocaleString()} event${data.total === 1 ? '' : 's'}` : ''} pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th} style={{ width: 28 }} />
                <th className={th}>When</th>
                <th className={th}>Who</th>
                <th className={th}>Action</th>
                <th className={th}>Resource</th>
                <th className={th}>Outcome</th>
                <th className={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    {!data ? (
                      <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                    ) : (
                      <EmptyState
                        icon={History}
                        title={hasFilters ? 'No events match the selected filters.' : 'No activity recorded yet.'}
                        hint={hasFilters ? 'Try a different search term or date range.' : 'Every create, update and delete across the system will show up here.'}
                        action={hasFilters ? (
                          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                            Clear filters
                          </button>
                        ) : undefined}
                      />
                    )}
                  </td>
                </tr>
              )}
              {entries.map((e) => {
                const [datePart, timePart] = (fmtDT(e.at) || '').split(', ');
                return (
                  <tr key={e.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors" onClick={() => setSelected(e)}>
                    <td className={`${td} text-gray-300 dark:text-gray-600 group-hover:text-gray-400`}>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="font-semibold text-gray-700 dark:text-gray-200 text-[12.5px]">{datePart}</div>
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{timePart}</div>
                    </td>
                    <td className={td}>
                      {e.actor ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={e.actor.name} size="xs" />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">{e.actor.name}</div>
                            <div className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">{e.actor.email} · {e.actor.role}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">not signed in</span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <MethodBadge method={e.method} />
                        <div className="min-w-0">
                          <MethodChip method={e.method} />
                          <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">{e.path}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}><Chip cls={RESOURCE_TONE[e.resource] || 'm'}>{e.resource}</Chip></td>
                    <td className={td}>
                      <span className="inline-flex items-center">
                        <Dot tone={e.ok ? 'g' : 'r'} />
                        <span className={`text-xs font-bold tabular-nums ${e.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{e.statusCode}</span>
                      </span>
                    </td>
                    <td className={`${td} text-gray-400 dark:text-gray-500 font-mono text-[11px]`}>{e.ip || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {data && (
          <div className="p-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={data.total} pageSize={data.pageSize} />
          </div>
        )}
      </Card>
      {selected && <ActivityDetailDrawer entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* Distinct from the Activity tab above — this is specifically the
   "something actually broke" trail (backend/src/lib/errorHandler.js),
   not every request the API ever served. Each row's correlationId is
   the same one returned to whoever hit the error, so a support
   conversation ("it broke around 3pm, error ref abc123") becomes a
   direct lookup instead of guessing from a timestamp. */
function ErrorsTab() {
  const [resolved, setResolved] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { setPage(1); }, [resolved, from, to]);

  const load = () => {
    const params = new URLSearchParams();
    if (resolved) params.set('resolved', resolved);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));

    apiFetch(`/api/system-errors?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(res.status === 403 ? 'Your role does not have access to system errors.' : body.error || 'Could not load system errors.');
        }
        return res.json();
      })
      .then((body) => { setData(body); setLoadError(null); })
      .catch((err) => setLoadError(err.message));
  };
  useEffect(load, [resolved, from, to, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleResolved = async (entry) => {
    setBusyId(entry.id);
    try {
      const res = await apiFetch(`/api/system-errors/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !entry.resolved }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update.');
      setData((prev) => ({ ...prev, entries: prev.entries.map((e) => (e.id === entry.id ? body : e)) }));
      setSelected((prev) => (prev && prev.id === entry.id ? body : prev));
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const hasFilters = resolved || from || to;
  const clearFilters = () => { setResolved(''); setFrom(''); setTo(''); };

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  const entries = data?.entries || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <FilterBar hasFilters={hasFilters} onClear={clearFilters}>
        <ThemedSelect className="w-36" value={resolved} onChange={setResolved} options={RESOLVED_OPTIONS} placeholder="All" />
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInputCls} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInputCls} />
        </div>
      </FilterBar>

      <Card
        title="System errors"
        hint={data ? `${data.total.toLocaleString()} total · ${data.unresolvedTotal.toLocaleString()} unresolved` : ''}
        pad={false}
      >
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th} style={{ width: 28 }} />
                <th className={th}>When</th>
                <th className={th}>Message</th>
                <th className={th}>Where</th>
                <th className={th}>Who</th>
                <th className={th}>Reference</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    {!data ? (
                      <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                    ) : (
                      <EmptyState
                        icon={AlertTriangle}
                        title={hasFilters ? 'No errors match the selected filters.' : 'No system errors recorded.'}
                        hint={hasFilters ? 'Try a different filter or date range.' : "That's a good sign — unexpected server errors will show up here the moment one happens."}
                        action={hasFilters ? (
                          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                            Clear filters
                          </button>
                        ) : undefined}
                      />
                    )}
                  </td>
                </tr>
              )}
              {entries.map((e) => {
                const [datePart, timePart] = (fmtDT(e.at) || '').split(', ');
                return (
                  <tr key={e.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors" onClick={() => setSelected(e)}>
                    <td className={`${td} text-gray-300 dark:text-gray-600 group-hover:text-gray-400`}>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="font-semibold text-gray-700 dark:text-gray-200 text-[12.5px]">{datePart}</div>
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{timePart}</div>
                    </td>
                    <td className={`${td} max-w-sm truncate text-gray-800 dark:text-gray-100 font-medium`}>{e.message}</td>
                    <td className={td}>
                      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{e.method ? `${e.method} ` : ''}{e.path || '—'}</span>
                    </td>
                    <td className={td}>
                      {e.actor ? (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{e.actor.name}</div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">not signed in</span>
                      )}
                    </td>
                    <td className={td} onClick={(ev) => ev.stopPropagation()}>
                      {e.correlationId ? (
                        <button
                          className="inline-flex items-center gap-1 font-mono text-[10.5px] text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                          onClick={() => copyToClipboard(e.correlationId, 'Correlation ID copied to clipboard.')}
                          title="Copy correlation ID"
                        >
                          {e.correlationId.slice(0, 8)}… <Copy className="w-3 h-3" />
                        </button>
                      ) : '—'}
                    </td>
                    <td className={td}>
                      <span className="inline-flex items-center">
                        <Dot tone={e.resolved ? 'g' : 'r'} />
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${e.resolved ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {e.resolved ? 'Resolved' : 'Unresolved'}
                        </span>
                      </span>
                    </td>
                    <td className={`${td} text-right`} onClick={(ev) => ev.stopPropagation()}>
                      <button
                        className={tableIconBtnCls(e.resolved ? 'primary' : 'green')}
                        title={e.resolved ? 'Mark unresolved' : 'Mark resolved'}
                        onClick={() => toggleResolved(e)}
                        disabled={busyId === e.id}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {data && (
          <div className="p-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={data.total} pageSize={data.pageSize} />
          </div>
        )}
      </Card>
      {selected && (
        <ErrorDetailDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onToggleResolved={toggleResolved}
          busy={busyId === selected.id}
        />
      )}
    </>
  );
}

export default function AuditLog() {
  const [tab, setTab] = useState('activity');

  return (
    <>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button className={tabCls(tab === 'activity')} onClick={() => setTab('activity')}><History className="w-3.5 h-3.5" /> Activity</button>
          <button className={tabCls(tab === 'errors')} onClick={() => setTab('errors')}><AlertTriangle className="w-3.5 h-3.5" /> Errors</button>
        </div>
      </div>

      {tab === 'activity' ? <ActivityTab /> : <ErrorsTab />}
    </>
  );
}
