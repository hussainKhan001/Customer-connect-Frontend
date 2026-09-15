import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, rowActionCls, Avatar, StatsCards, Pagination } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import { useApp } from '../context/AppContext.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { fmtD } from '../utils/core.js';
import { PROJECTS } from '../constants/projects.js';
import { STATUSLBL } from '../constants/segments.js';
import CompleteRecordModal from '../components/CompleteRecordModal.jsx';

const PAGE_SIZE = 50;

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';

const MISSING_FIELDS = ['PAN', 'Area', 'Rate', 'Consideration', 'Booking date'];
const STATUS_OPTS = [{ value: '', label: 'All statuses' }, ...Object.keys(STATUSLBL).map((k) => ({ value: k, label: STATUSLBL[k] }))];
const PROJ_OPTS = [{ value: '', label: 'All projects' }, ...PROJECTS.map((p) => ({ value: p.name, label: p.name }))];
const MISSING_OPTS = [{ value: '', label: 'Missing anything' }, ...MISSING_FIELDS.map((m) => ({ value: m, label: `Missing ${m}` }))];

function missingFrom(c) {
  const u = c.units[0] || {};
  const miss = [];
  if (!c.pan) miss.push('PAN');
  if (!(u.saleable > 0)) miss.push('Area');
  if (!(u.rate > 0)) miss.push('Rate');
  if (!(u.consideration > 0)) miss.push('Consideration');
  if (!u.bookDate) miss.push('Booking date');
  return miss;
}

export default function IncompleteRecords() {
  const { incompleteRecords } = useApp();
  const [completing, setCompleting] = useState(null);
  const [filters, setFilters] = useState({ q: '', proj: '', status: '', missing: '' });

  const setSel = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  /* built off every filter EXCEPT project, so all four project tiles
     keep showing real numbers to click into — same "tile as filter
     shortcut" pattern as Owner Base's project breakdown. */
  const rowsForProjectStats = useMemo(() => incompleteRecords.filter((c) => {
    const u = c.units[0] || {};
    return (!filters.status || c.status === filters.status)
      && (!filters.missing || missingFrom(c).includes(filters.missing))
      && (!filters.q || (c.name + c.id + c.mobile + (u.unit || '')).toLowerCase().includes(filters.q.toLowerCase()));
  }), [incompleteRecords, filters.status, filters.missing, filters.q]);

  const PROJECT_STATS = useMemo(() => PROJECTS.map((p) => ({
    name: p.name,
    count: rowsForProjectStats.filter((c) => (c.units[0] || {}).project === p.name).length,
  })), [rowsForProjectStats]);

  const rows = useMemo(() => rowsForProjectStats.filter((c) =>
    !filters.proj || (c.units[0] || {}).project === filters.proj
  ), [rowsForProjectStats, filters.proj]);

  const { page, setPage, totalPages, pageItems: pagedRows, pageSize, setPageSize } = usePagination(rows, {
    pageSize: PAGE_SIZE, resetKey: filters,
  });

  return (
    <>
      <Banner kind="warn">
        <b>These records don't have a real PAN and/or confirmed unit financials yet</b> — they came from a
        raw allotment/inventory list, not a booking form. They're already in the owner base, but with no
        real number to show until completed — score, gain and value all read as 0 rather than a guess, so
        a made-up figure never reaches a customer. Complete each one below to make it a fully scored owner.
      </Banner>

      <StatsCards
        cards={PROJECT_STATS.filter((p) => p.count > 0).map((p) => ({
          filterValue: p.name,
          label: p.name,
          value: p.count,
          topBorderColor: 'border-t-primary-500',
          title: filters.proj === p.name ? `Clear the ${p.name} filter` : `Filter to ${p.name}`,
          sub: 'held',
        }))}
        activeFilter={filters.proj}
        onCardClick={(v) => setFilters((f) => ({ ...f, proj: v }))}
      />

      <div className="flex flex-nowrap gap-2 items-center overflow-x-auto custom-horizontal-scrollbar pb-2 mb-2.5">
        <div className="relative flex-shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID, mobile or unit"
            value={filters.q}
            onChange={set('q')}
            className="pl-8 pr-3 py-2 h-10 border rounded-full shadow-sm text-sm bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-56 flex-shrink-0"
          />
        </div>
        <ThemedSelect className="w-36 flex-shrink-0" value={filters.proj} onChange={setSel('proj')} options={PROJ_OPTS} placeholder="All projects" />
        <ThemedSelect className="w-36 flex-shrink-0" value={filters.status} onChange={setSel('status')} options={STATUS_OPTS} placeholder="All statuses" />
        <ThemedSelect className="w-44 flex-shrink-0" value={filters.missing} onChange={setSel('missing')} options={MISSING_OPTS} placeholder="Missing anything" />
      </div>

      <div className="flex items-center mb-2.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{rows.length}</span>
        <span className="ml-1">of {incompleteRecords.length} held</span>
      </div>

      <Card title="Incomplete records" pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Owner</th>
                <th className={th}>Mobile</th>
                <th className={th}>Project / unit</th>
                <th className={th}>DOB / Anniversary</th>
                <th className={th}>Occupation</th>
                <th className={th}>Missing</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((c) => {
                const u = c.units[0] || {};
                const miss = missingFrom(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 ">
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <b className="text-gray-900 dark:text-white">{c.name}</b>
                          <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>{c.mobile}</td>
                    <td className={td}>
                      {u.unit}
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                        {u.project}{u.consideration ? ` · ${fmtD(u.bookDate)}` : ''}
                      </div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      {c.dob ? <>DOB {fmtD(c.dob)}</> : <span className="italic">DOB not captured</span>}
                      <div>{c.spouseDob ? <>Anniv. {fmtD(c.spouseDob)}</> : <span className="italic">Anniversary not captured</span>}</div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      {c.occupation && c.occupation !== 'Not captured' ? c.occupation : <span className="italic">Not captured</span>}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {miss.map((m) => <Chip key={m} cls="r">{m}</Chip>)}
                      </div>
                    </td>
                    <td className={`${td} text-right`}>
                      <button className={rowActionCls('primary')} onClick={() => setCompleting(c)}>
                        Complete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td className={td} colSpan={7}>
                  {incompleteRecords.length ? 'No records match the selected filters.' : 'Nothing held — every record has a real PAN and confirmed financials.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </TableWrap>
        {rows.length > 0 && (
          <div className="px-4 pb-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={rows.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        )}
      </Card>

      {completing && <CompleteRecordModal customer={completing} onClose={() => setCompleting(null)} />}
    </>
  );
}
