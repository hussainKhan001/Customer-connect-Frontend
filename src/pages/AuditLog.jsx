import { Fragment, useEffect, useMemo, useState } from 'react';
import { History, Search, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, EmptyState, Pagination, btnGhost } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import { apiFetch } from '../utils/api.js';
import { fmtDT } from '../utils/core.js';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

const METHOD_TONE = {
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
const MethodChip = ({ method }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${METHOD_TONE[method] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
    {method}
  </span>
);

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

/* Every create/update/delete the API has ever handled — written by the
   backend's auditRoute() middleware (see backend/src/lib/auditLog.js),
   mounted on every resource router, not hand-logged per action. This
   page is purely a read-only viewer onto that trail; the "action"
   itself already happened by the time a row exists here. */
export default function AuditLog() {
  const [resource, setResource] = useState('');
  const [method, setMethod] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actorInput, setActorInput] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  /* debounce the free-text search only — every other filter is a
     dropdown/date picker, where each change is already a single
     deliberate action worth an immediate refetch */
  useEffect(() => {
    const t = setTimeout(() => setActor(actorInput.trim()), 400);
    return () => clearTimeout(t);
  }, [actorInput]);

  useEffect(() => { setPage(1); }, [resource, method, outcome, actor, from, to]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (resource) params.set('resource', resource);
    if (method) params.set('method', method);
    if (outcome) params.set('ok', outcome);
    if (actor) params.set('actor', actor);
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
  }, [resource, method, outcome, actor, from, to, page]);

  const resourceOptions = useMemo(
    () => [{ value: '', label: 'All resources' }, ...((data?.resources || []).map((r) => ({ value: r, label: r })))],
    [data?.resources]
  );

  const hasFilters = resource || method || outcome || actor || from || to;
  const clearFilters = () => { setResource(''); setMethod(''); setOutcome(''); setActorInput(''); setActor(''); setFrom(''); setTo(''); };

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  const entries = data?.entries || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={actorInput}
            onChange={(e) => setActorInput(e.target.value)}
            placeholder="Search by name or email"
            className="pl-8 pr-3 py-2 h-10 border rounded-md shadow-sm text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-56"
          />
        </div>
        <ThemedSelect className="w-40" value={resource} onChange={setResource} options={resourceOptions} placeholder="All resources" />
        <ThemedSelect className="w-44" value={method} onChange={setMethod} options={METHOD_OPTIONS} placeholder="All methods" />
        <ThemedSelect className="w-40" value={outcome} onChange={setOutcome} options={OUTCOME_OPTIONS} placeholder="All outcomes" />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-2.5 py-2 h-10 border rounded-md shadow-sm text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-2.5 py-2 h-10 border rounded-md shadow-sm text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
        />
        {hasFilters && (
          <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={clearFilters}>Clear</button>
        )}
      </div>

      <Card title="Audit log" hint={data ? `${data.total} event${data.total === 1 ? '' : 's'}` : ''} pad={false}>
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
                const isOpen = expanded === e.id;
                return (
                  <Fragment key={e.id}>
                    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => setExpanded(isOpen ? null : e.id)}>
                      <td className={`${td} text-gray-400`}>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                      </td>
                      <td className={`${td} whitespace-nowrap text-gray-500 dark:text-gray-400`}>{fmtDT(e.at)}</td>
                      <td className={td}>
                        {e.actor ? (
                          <>
                            <div className="font-semibold text-gray-900 dark:text-white">{e.actor.name}</div>
                            <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{e.actor.email} · {e.actor.role}</div>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">not signed in</span>
                        )}
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5">
                          <MethodChip method={e.method} />
                          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{e.path}</span>
                        </div>
                      </td>
                      <td className={td}><Chip cls="m">{e.resource}</Chip></td>
                      <td className={td}>
                        <Chip cls={e.ok ? 'g' : 'r'}>{e.statusCode}</Chip>
                      </td>
                      <td className={`${td} text-gray-400 dark:text-gray-500 font-mono text-[11px]`}>{e.ip || '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-900/40">
                          <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-gray-600 dark:text-gray-300 m-0">
{JSON.stringify({ params: e.params, body: e.body }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
    </>
  );
}
