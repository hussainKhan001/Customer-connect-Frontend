/* This owner's own slice of the system-wide Audit Log (see
   pages/AuditLog.jsx) — every create/update/delete the API has ever
   handled against this specific customer record, who did it and when.
   Same auditRoute() middleware, same AuditLog collection, just
   pre-filtered by resource=customers&recordId=<this owner's id> via
   the same GET /api/audit-logs route (see backend/src/routes/
   auditLogs.js's recordId param) — nothing customer-specific had to
   be added to the write path, since params.id already carries the
   owner's id on every one of these routes. */
import { Fragment, useEffect, useState } from 'react';
import { History, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, EmptyState, Pagination } from '../../components/Ui.jsx';
import { apiFetch } from '../../utils/api.js';
import { fmtDT } from '../../utils/core.js';

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

export default function MAuditLog({ c }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { setPage(1); setData(null); }, [c.id]);

  useEffect(() => {
    const params = new URLSearchParams({ resource: 'customers', recordId: c.id, page: String(page) });
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
  }, [c.id, page]);

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  const entries = data?.entries || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card title="Audit log" hint={data ? `${data.total} event${data.total === 1 ? '' : 's'} on this owner` : ''} pad={false}>
      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th} style={{ width: 28 }} />
              <th className={th}>When</th>
              <th className={th}>Who</th>
              <th className={th}>Action</th>
              <th className={th}>Outcome</th>
              <th className={th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6}>
                  {!data ? (
                    <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                  ) : (
                    <EmptyState icon={History} title="No changes recorded for this owner yet." />
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
                    <td className={td}>
                      <Chip cls={e.ok ? 'g' : 'r'}>{e.statusCode}</Chip>
                    </td>
                    <td className={`${td} text-gray-400 dark:text-gray-500 font-mono text-[11px]`}>{e.ip || '—'}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-900/40">
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
  );
}
